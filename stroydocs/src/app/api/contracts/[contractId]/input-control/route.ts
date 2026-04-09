import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { createInputControlRecordSchema } from '@/lib/validations/input-control';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/** Проверка доступа к договору через организацию */
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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const where = { batch: { material: { contractId: params.contractId } } };

    // Получаем записи ЖВК через batch → material → contract
    const [records, total] = await Promise.all([
      db.inputControlRecord.findMany({
        where,
        include: {
          batch: {
            include: {
              material: { select: { id: true, name: true, unit: true } },
            },
          },
          inspector: { select: { id: true, firstName: true, lastName: true, position: true } },
          _count: { select: { acts: true } },
        },
        orderBy: { date: 'desc' },
        take: limit,
        skip,
      }),
      db.inputControlRecord.count({ where }),
    ]);

    return successResponse({ data: records, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения записей ЖВК');
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
    const parsed = createInputControlRecordSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Проверяем, что партия принадлежит материалу этого договора
    const batch = await db.materialBatch.findFirst({
      where: {
        id: parsed.data.batchId,
        material: { contractId: params.contractId },
      },
    });
    if (!batch) return errorResponse('Партия не найдена в данном договоре', 404);

    const record = await db.inputControlRecord.create({
      data: {
        date: new Date(parsed.data.date),
        result: parsed.data.result,
        notes: parsed.data.notes,
        batchId: parsed.data.batchId,
        inspectorId: session.user.id,
      },
      include: {
        batch: {
          include: {
            material: { select: { id: true, name: true, unit: true } },
          },
        },
        inspector: { select: { id: true, firstName: true, lastName: true, position: true } },
        _count: { select: { acts: true } },
      },
    });

    return successResponse(record);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания записи ЖВК');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
