import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { classifyExecutionDoc } from '@/lib/id-classification';
import type { ExecutionDocType } from '@prisma/client';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; contractId: string } };

const createKsActSchema = z.object({
  type: z.enum(['KS_11', 'KS_14']),
  title: z.string().optional(),
  documentDate: z.string().datetime().optional(),
});

/** GET — список КС-11/КС-14 актов по договору */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const searchParams = req.nextUrl.searchParams;
    const typeParam = searchParams.get('type') as ExecutionDocType | null;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const skip = (page - 1) * limit;

    const where = {
      contractId: params.contractId,
      type: typeParam
        ? (typeParam as ExecutionDocType)
        : { in: ['KS_11', 'KS_14'] as ExecutionDocType[] },
    };

    const [acts, total] = await Promise.all([
      db.executionDoc.findMany({
        where,
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          ksActFormData: true,
          _count: { select: { signatures: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.executionDoc.count({ where }),
    ]);

    return successResponse({ data: acts, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения актов КС-11/КС-14');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST — создать акт КС-11 или КС-14 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = createKsActSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { type, title, documentDate } = parsed.data;

    // Автонумерация: КС11-001 / КС14-001
    const count = await db.executionDoc.count({
      where: { contractId: params.contractId, type },
    });
    const prefix = type === 'KS_11' ? 'КС11' : 'КС14';
    const number = `${prefix}-${String(count + 1).padStart(3, '0')}`;
    const autoTitle = title || (type === 'KS_11' ? 'Акт приёмки КС-11' : 'Акт приёмки КС-14');

    // Создание ExecutionDoc + KsActFormData атомарно через вложенный create
    const doc = await db.executionDoc.create({
      data: {
        type,
        number,
        title: autoTitle,
        contractId: params.contractId,
        createdById: session.user.id,
        idCategory: classifyExecutionDoc(type),
        documentDate: documentDate ? new Date(documentDate) : undefined,
        ksActFormData: { create: {} },
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        ksActFormData: true,
        _count: { select: { signatures: true, comments: true } },
      },
    });

    return successResponse(doc);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания акта КС-11/КС-14');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
