import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { createBatchSchema } from '@/lib/validations/input-control';
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
  { params }: { params: { contractId: string; materialId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await verifyContractAccess(params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const batches = await db.materialBatch.findMany({
      where: { materialId: params.materialId, material: { contractId: params.contractId } },
      include: {
        _count: { select: { inputControlRecords: true } },
      },
      orderBy: { arrivalDate: 'desc' },
    });

    return successResponse(batches);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения партий материала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { contractId: string; materialId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await verifyContractAccess(params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    // Проверяем, что материал принадлежит договору
    const material = await db.material.findFirst({
      where: { id: params.materialId, contractId: params.contractId },
    });
    if (!material) return errorResponse('Материал не найден', 404);

    const body = await req.json();
    const parsed = createBatchSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const batch = await db.materialBatch.create({
      data: {
        batchNumber: parsed.data.batchNumber,
        quantity: parsed.data.quantity,
        arrivalDate: new Date(parsed.data.arrivalDate),
        storageLocation: parsed.data.storageLocation,
        materialId: params.materialId,
      },
    });

    return successResponse(batch);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания партии материала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
