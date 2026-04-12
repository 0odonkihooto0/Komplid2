import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createRFISchema } from '@/lib/validations/rfi';
import { getNextRFINumber } from '@/lib/numbering';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { objectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assigneeId = searchParams.get('assigneeId');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const skip = (page - 1) * limit;

    // Полнотекстовый поиск через PostgreSQL tsvector
    if (search) {
      const results = await db.$queryRaw<{ id: string }[]>`
        SELECT id FROM rfis
        WHERE "projectId" = ${params.objectId}
          AND search_vector @@ plainto_tsquery('russian', ${search})
        ORDER BY "createdAt" DESC
        LIMIT ${limit} OFFSET ${skip}
      `;
      const ids = results.map((r: { id: string }) => r.id);

      const items = await db.rFI.findMany({
        where: { id: { in: ids } },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { attachments: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return successResponse({ data: items, page, limit });
    }

    const where: Record<string, unknown> = { projectId: params.objectId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;

    const [items, total] = await Promise.all([
      db.rFI.findMany({
        where,
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { attachments: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.rFI.count({ where }),
    ]);

    return successResponse({ data: items, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения списка RFI');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createRFISchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { deadline, assigneeId, ...rest } = parsed.data;

    const number = await getNextRFINumber(params.objectId);

    const rfi = await db.rFI.create({
      data: {
        ...rest,
        number,
        projectId: params.objectId,
        authorId: session.user.id,
        assigneeId: assigneeId ?? null,
        deadline: deadline ? new Date(deadline) : null,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Уведомляем назначенного исполнителя
    if (assigneeId) {
      await db.notification.create({
        data: {
          userId: assigneeId,
          type: 'RFI_ASSIGNED',
          title: 'Вам назначен вопрос RFI',
          body: `${rfi.number}: ${rfi.title}`,
          entityType: 'RFI',
          entityId: rfi.id,
        },
      });
    }

    return successResponse(rfi);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания RFI');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
