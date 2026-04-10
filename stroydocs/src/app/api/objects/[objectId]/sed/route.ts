import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createSEDSchema } from '@/lib/validations/sed';
import { getNextSEDNumber } from '@/lib/numbering';

export const dynamic = 'force-dynamic';

type SEDView = 'all' | 'active' | 'requires' | 'my' | 'sent';

// Дополнительный фильтр из строки запроса (объединяется с baseWhere через AND)
function buildAdditionalWhere(
  senderOrg: string | null,
  receiverOrg: string | null,
  dateFrom: string | null,
  dateTo: string | null,
  folderId: string | null,
): Record<string, unknown> {
  const extra: Record<string, unknown> = {};

  if (senderOrg) {
    extra.senderOrg = { name: { contains: senderOrg, mode: 'insensitive' } };
  }
  if (receiverOrg) {
    extra.receiverOrg = { name: { contains: receiverOrg, mode: 'insensitive' } };
  }
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);
    extra.date = dateFilter;
  }
  if (folderId) {
    extra.folderLinks = { some: { folderId } };
  }

  return extra;
}

const INCLUDE = {
  author: { select: { id: true, firstName: true, lastName: true } },
  senderOrg: { select: { id: true, name: true } },
  receiverOrg: { select: { id: true, name: true } },
  _count: { select: { attachments: true } },
} as const;

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

    const sp = req.nextUrl.searchParams;
    const view = (sp.get('view') ?? 'all') as SEDView;
    const status = sp.get('status');
    const docType = sp.get('docType');
    const search = sp.get('search');
    const folderId = sp.get('folderId');
    const senderOrg = sp.get('senderOrg');
    const receiverOrg = sp.get('receiverOrg');
    const dateFrom = sp.get('dateFrom');
    const dateTo = sp.get('dateTo');
    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(sp.get('limit') ?? '50', 10)));
    const skip = (page - 1) * limit;

    const extra = buildAdditionalWhere(senderOrg, receiverOrg, dateFrom, dateTo, folderId);

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
        where: { id: { in: ids }, ...extra },
        include: INCLUDE,
        orderBy: { createdAt: 'desc' },
      });

      return successResponse({ data: items, page, limit, total: ids.length });
    }

    const baseWhere: Record<string, unknown> = {
      projectId: params.objectId,
      ...extra,
    };
    if (status) baseWhere.status = status;
    if (docType) baseWhere.docType = docType;

    let where: Record<string, unknown> = baseWhere;

    switch (view) {
      case 'active':
        where = { ...baseWhere, status: { notIn: ['REJECTED', 'ARCHIVED'] } };
        break;
      case 'requires':
        where = {
          ...baseWhere,
          status: 'REQUIRES_ACTION',
          approvalRoute: {
            steps: { some: { userId: session.user.id, status: 'PENDING' } },
          },
        };
        break;
      case 'my':
        // Участвую: автор ИЛИ наблюдатель
        where = {
          ...baseWhere,
          OR: [
            { authorId: session.user.id },
            { observers: { has: session.user.id } },
          ],
        };
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
        include: INCLUDE,
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

    const { senderOrgId, number: customNumber, ...rest } = parsed.data;

    const senderOrgEntity = await db.organization.findUnique({ where: { id: senderOrgId } });
    if (!senderOrgEntity) return errorResponse('Организация-отправитель не найдена', 404);

    // Используем кастомный номер из формы или автогенерацию через advisory lock
    const number = customNumber?.trim()
      ? customNumber.trim()
      : await getNextSEDNumber(params.objectId);

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
        receiverOrg: { select: { id: true, name: true } },
      },
    });

    return successResponse(doc);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания СЭД-документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
