import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { createExecutionDocSchema } from '@/lib/validations/execution-doc';
import { successResponse, errorResponse } from '@/utils/api';
import { EXECUTION_DOC_TYPE_LABELS } from '@/utils/constants';
import type { ExecutionDocType, IdCategory } from '@prisma/client';
import { classifyExecutionDoc } from '@/lib/id-classification';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const searchParams = req.nextUrl.searchParams;
    const typeParam = searchParams.get('type') as ExecutionDocType | null;
    const typesParam = searchParams.get('types');
    const types = typesParam ? (typesParam.split(',') as ExecutionDocType[]) : null;
    const status = searchParams.get('status');
    const idCategory = searchParams.get('idCategory') as IdCategory | null;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50')));
    const skip = (page - 1) * limit;

    const where = {
      contractId: params.contractId,
      ...(typeParam && { type: typeParam }),
      ...(types && types.length > 0 && { type: { in: types } }),
      ...(status && { status: status as 'DRAFT' | 'IN_REVIEW' | 'SIGNED' | 'REJECTED' }),
      ...(idCategory && { idCategory }),
    };

    const [docs, total] = await Promise.all([
      db.executionDoc.findMany({
        where,
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { signatures: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.executionDoc.count({ where }),
    ]);

    return successResponse({ data: docs, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения исполнительных документов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createExecutionDocSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { type, workRecordId, title } = parsed.data;

    // Проверка записи о работе
    let workRecordInfo = '';
    if (workRecordId) {
      const workRecord = await db.workRecord.findFirst({
        where: { id: workRecordId, contractId: params.contractId },
        include: { workItem: { select: { name: true } } },
      });
      if (!workRecord) {
        return errorResponse('Запись о работе не найдена в данном договоре', 404);
      }
      workRecordInfo = workRecord.workItem?.name ?? '';
    }

    // Генерация номера документа
    const count = await db.executionDoc.count({
      where: { contractId: params.contractId, type },
    });
    const TYPE_PREFIX: Partial<Record<ExecutionDocType, string>> = {
      AOSR: 'АОСР', OZR: 'ОЖР', TECHNICAL_READINESS_ACT: 'АТГ',
      GENERAL_DOCUMENT: 'ДОК', KS_6A: 'КС6А', KS_11: 'КС11', KS_14: 'КС14',
    };
    const number = `${TYPE_PREFIX[type] ?? type}-${String(count + 1).padStart(3, '0')}`;

    // Автогенерация заголовка
    const autoTitle = title || `${EXECUTION_DOC_TYPE_LABELS[type]}${workRecordInfo ? ` — ${workRecordInfo}` : ''}`;

    const doc = await db.executionDoc.create({
      data: {
        type,
        number,
        title: autoTitle,
        contractId: params.contractId,
        workRecordId: workRecordId || null,
        createdById: session.user.id,
        idCategory: classifyExecutionDoc(type),
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { signatures: true, comments: true } },
      },
    });

    return successResponse(doc);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания исполнительного документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
