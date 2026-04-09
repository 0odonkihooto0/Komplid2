import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createSEDSchema } from '@/lib/validations/sed';
import { getNextSEDNumber } from '@/lib/numbering';
export const dynamic = 'force-dynamic';

type SEDView = 'all' | 'active' | 'requires' | 'my' | 'sent';

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
    const view = (searchParams.get('view') ?? 'all') as SEDView;
    const status = searchParams.get('status');
    const docType = searchParams.get('docType');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const skip = (page - 1) * limit;

    // Полнотекстовый поиск через PostgreSQL tsvector
    if (search) {
      const results = await db.$queryRaw<{ id: string }[]>`
        SELECT id FROM sed_documents
        WHERE project_id = ${params.objectId}
          AND search_vector @@ plainto_tsquery('russian', ${search})
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${skip}
      `;
      const ids = results.map((r: { id: string }) => r.id);

      const items = await db.sEDDocument.findMany({
        where: { id: { in: ids } },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          senderOrg: { select: { id: true, name: true } },
          _count: { select: { attachments: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return successResponse({ data: items, page, limit });
    }

    const baseWhere: Record<string, unknown> = { projectId: params.objectId };
    if (status) baseWhere.status = status;
    if (docType) baseWhere.docType = docType;

    let where: Record<string, unknown> = baseWhere;

    // Фильтрация по представлению (как в ЦУС)
    switch (view) {
      case 'active':
        where = { ...baseWhere, status: { notIn: ['REJECTED', 'ARCHIVED'] } };
        break;
      case 'requires':
        where = {
          ...baseWhere,
          status: 'REQUIRES_ACTION',
          approvalRoute: {
            steps: {
              some: { userId: session.user.id, status: 'PENDING' },
            },
          },
        };
        break;
      case 'my':
        where = { ...baseWhere, authorId: session.user.id };
        break;
      case 'sent':
        where = { ...baseWhere, senderOrgId: session.user.organizationId };
        break;
      default:
        where = baseWhere;
    }

    const [items, total] = await Promise.all([
      db.sEDDocument.findMany({
        where,
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          senderOrg: { select: { id: true, name: true } },
          _count: { select: { attachments: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.sEDDocument.count({ where }),
    ]);

    return successResponse({ data: items, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения списка СЭД');
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
    const parsed = createSEDSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { senderOrgId, ...rest } = parsed.data;

    // Проверяем существование организации-отправителя
    const senderOrg = await db.organization.findUnique({ where: { id: senderOrgId } });
    if (!senderOrg) return errorResponse('Организация-отправитель не найдена', 404);

    const number = await getNextSEDNumber(params.objectId);

    const doc = await db.sEDDocument.create({
      data: {
        ...rest,
        number,
        projectId: params.objectId,
        senderOrgId,
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        senderOrg: { select: { id: true, name: true } },
      },
    });

    return successResponse(doc);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания СЭД-документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
