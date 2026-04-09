import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { createMaterialSchema } from '@/lib/validations/material';
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

    const materials = await db.material.findMany({
      where: { contractId: params.contractId },
      include: {
        documents: { select: { id: true, type: true, fileName: true } },
        _count: { select: { writeoffs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(materials);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения материалов');
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
    const parsed = createMaterialSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { invoiceDate, ...rest } = parsed.data;

    const material = await db.material.create({
      data: {
        ...rest,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
        contractId: params.contractId,
      },
    });

    return successResponse(material);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания материала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
