import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createCorrespondenceSchema } from '@/lib/validations/correspondence';
import { getNextCorrespondenceNumber } from '@/lib/numbering';
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
    const direction = searchParams.get('direction') as 'OUTGOING' | 'INCOMING' | null;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const skip = (page - 1) * limit;

    // Полнотекстовый поиск через PostgreSQL tsvector
    if (search) {
      const results = await db.$queryRaw<{ id: string }[]>`
        SELECT id FROM correspondences
        WHERE "projectId" = ${params.objectId}
          AND search_vector @@ plainto_tsquery('russian', ${search})
        ORDER BY "createdAt" DESC
        LIMIT ${limit} OFFSET ${skip}
      `;
      const ids = results.map((r: { id: string }) => r.id);

      const items = await db.correspondence.findMany({
        where: { id: { in: ids } },
        include: {
          buildingObject: { select: { id: true, name: true } },
          author: { select: { id: true, firstName: true, lastName: true } },
          senderOrg: { select: { id: true, name: true } },
          receiverOrg: { select: { id: true, name: true } },
          _count: { select: { attachments: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return successResponse({ data: items, page, limit });
    }

    const where: Record<string, unknown> = { projectId: params.objectId };
    if (direction) where.direction = direction;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      db.correspondence.findMany({
        where,
        include: {
          buildingObject: { select: { id: true, name: true } },
          author: { select: { id: true, firstName: true, lastName: true } },
          senderOrg: { select: { id: true, name: true } },
          receiverOrg: { select: { id: true, name: true } },
          _count: { select: { attachments: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.correspondence.count({ where }),
    ]);

    return successResponse({ data: items, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения списка переписки');
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
    const parsed = createCorrespondenceSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { direction, senderOrgId, receiverOrgId, sentAt, ...rest } = parsed.data;

    // Проверяем существование организаций
    const [senderOrg, receiverOrg] = await Promise.all([
      db.organization.findUnique({ where: { id: senderOrgId } }),
      db.organization.findUnique({ where: { id: receiverOrgId } }),
    ]);
    if (!senderOrg) return errorResponse('Организация-отправитель не найдена', 404);
    if (!receiverOrg) return errorResponse('Организация-получатель не найдена', 404);

    const number = await getNextCorrespondenceNumber(params.objectId, direction);

    const correspondence = await db.correspondence.create({
      data: {
        ...rest,
        number,
        direction,
        projectId: params.objectId,
        senderOrgId,
        receiverOrgId,
        authorId: session.user.id,
        sentAt: sentAt ? new Date(sentAt) : undefined,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        senderOrg: { select: { id: true, name: true } },
        receiverOrg: { select: { id: true, name: true } },
      },
    });

    return successResponse(correspondence);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания письма');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
