import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createSEDSchema } from '@/lib/validations/sed';
import { getNextSEDNumber } from '@/lib/numbering';
export const dynamic = 'force-dynamic';

type SEDView = 'all' | 'active' | 'requires_action' | 'participating' | 'sent_by_me';

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const searchParams = req.nextUrl.searchParams;
    const view = (searchParams.get('view') ?? 'all') as SEDView;
    const status = searchParams.get('status');
    const docType = searchParams.get('docType');
    const folderId = searchParams.get('folderId');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const skip = (page - 1) * limit;

    // Фильтр видимости документа (на уровне документа, как в ЦУС)
    const visibilityWhere = {
      OR: [
        { authorId: session.user.id },
        { senderOrgId: session.user.organizationId },
        { receiverOrgIds: { has: session.user.organizationId } },
        { receiverOrgId: session.user.organizationId },
        { observers: { has: session.user.id } },
        {
          workflows: {
            some: {
              OR: [
                { initiatorId: session.user.id },
                { participants: { has: session.user.id } },
                { observers: { has: session.user.id } },
              ],
            },
          },
        },
      ],
    };

    // Полнотекстовый поиск через PostgreSQL tsvector
    if (search) {
      const results = await db.$queryRaw<{ id: string }[]>`
        SELECT id FROM sed_documents
        WHERE "projectId" = ${params.projectId}
          AND search_vector @@ plainto_tsquery('russian', ${search})
        ORDER BY "createdAt" DESC
        LIMIT ${limit} OFFSET ${skip}
      `;
      const ids = results.map((r: { id: string }) => r.id);

      const items = await db.sEDDocument.findMany({
        where: { id: { in: ids }, ...visibilityWhere },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          senderOrg: { select: { id: true, name: true } },
          _count: { select: { attachments: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return successResponse({ data: items, page, limit });
    }

    const baseWhere: Record<string, unknown> = {
      projectId: params.projectId,
      ...visibilityWhere,
    };
    if (status) baseWhere.status = status;
    if (docType) baseWhere.docType = docType;
    if (folderId) baseWhere.folderLinks = { some: { folderId } };

    let where: Record<string, unknown> = baseWhere;

    // Фильтрация по представлению поверх видимости
    switch (view) {
      case 'active':
        where = { ...baseWhere, status: { notIn: ['REJECTED', 'ARCHIVED'] } };
        break;
      case 'requires_action':
        where = {
          ...baseWhere,
          approvalRoute: {
            steps: {
              some: { userId: session.user.id, status: 'PENDING' },
            },
          },
        };
        break;
      case 'participating':
        where = {
          ...baseWhere,
          workflows: {
            some: {
              OR: [
                { participants: { has: session.user.id } },
                { observers: { has: session.user.id } },
              ],
            },
          },
        };
        break;
      case 'sent_by_me':
        where = { ...baseWhere, authorId: session.user.id };
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
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createSEDSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { senderOrgId, ...rest } = parsed.data;

    // Проверяем существование организации-отправителя
    const senderOrg = await db.organization.findUnique({ where: { id: senderOrgId } });
    if (!senderOrg) return errorResponse('Организация-отправитель не найдена', 404);

    const number = await getNextSEDNumber(params.projectId);

    const doc = await db.sEDDocument.create({
      data: {
        ...rest,
        number,
        projectId: params.projectId,
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
