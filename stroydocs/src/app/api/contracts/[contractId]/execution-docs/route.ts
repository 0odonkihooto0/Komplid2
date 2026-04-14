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

/** Проверка доступа к договору */
async function verifyContractAccess(contractId: string, organizationId: string) {
  return db.contract.findFirst({
    where: { id: contractId, buildingObject: { organizationId } },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await verifyContractAccess(params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') as ExecutionDocType | null;
    const status = searchParams.get('status');
    const idCategory = searchParams.get('idCategory') as IdCategory | null;
    // Пользовательская иерархическая категория ИД
    const categoryId = searchParams.get('categoryId');

    // Пагинация (лимит 50, макс 200)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50')));
    const skip = (page - 1) * limit;

    const where = {
      contractId: params.contractId,
      ...(type && { type }),
      ...(status && { status: status as 'DRAFT' | 'IN_REVIEW' | 'SIGNED' | 'REJECTED' }),
      ...(idCategory && { idCategory }),
      ...(categoryId && { categoryId }),
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

    return successResponse(docs, { total, page, pageSize: limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения исполнительных документов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await verifyContractAccess(params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

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
