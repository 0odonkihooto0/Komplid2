import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createDesignDocSchema } from '@/lib/validations/design-doc';
import { getNextDesignDocNumber } from '@/lib/numbering';
import type { DesignDocType, DesignDocStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

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

    const sp = req.nextUrl.searchParams;
    const docType = sp.get('docType') as DesignDocType | null;
    const status = sp.get('status') as DesignDocStatus | null;
    const category = sp.get('category');
    const showDeleted = sp.get('showDeleted') === 'true';
    // Фильтр для двусторонней привязки: вернуть только документы, связанные с конкретным АОСР
    const linkedTo = sp.get('linkedTo');
    const page = Math.max(1, parseInt(sp.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(sp.get('limit') ?? '50')));
    const skip = (page - 1) * limit;

    const where = {
      projectId: params.projectId,
      isDeleted: showDeleted ? undefined : false,
      ...(docType && { docType }),
      ...(status && { status }),
      ...(category && { category }),
      // Prisma поддерживает { has: value } для PostgreSQL String[]-массивов
      ...(linkedTo && { linkedExecDocIds: { has: linkedTo } }),
    };

    const [docs, total] = await Promise.all([
      db.designDocument.findMany({
        where,
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          responsibleOrg: { select: { id: true, name: true } },
          responsibleUser: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { comments: true, versions: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.designDocument.count({ where }),
    ]);

    return successResponse({ data: docs, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения документов ПИР');
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
    const parsed = createDesignDocSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { name, docType, category, responsibleOrgId, responsibleUserId, notes, s3Keys, currentS3Key } = parsed.data;

    const number = await getNextDesignDocNumber(params.projectId);

    const doc = await db.designDocument.create({
      data: {
        number,
        name,
        docType,
        category: category ?? null,
        version: 1,
        status: 'CREATED',
        responsibleOrgId: responsibleOrgId ?? null,
        responsibleUserId: responsibleUserId ?? null,
        notes: notes ?? null,
        s3Keys: s3Keys ?? [],
        currentS3Key: currentS3Key ?? null,
        projectId: params.projectId,
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { comments: true } },
      },
    });

    return successResponse(doc);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания документа ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
