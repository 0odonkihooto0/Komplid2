import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { createWorkItemSchema } from '@/lib/validations/work-item';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/** Проверка доступа к договору через организацию */
async function verifyContractAccess(contractId: string, organizationId: string) {
  const contract = await db.contract.findFirst({
    where: {
      id: contractId,
      buildingObject: { organizationId },
    },
  });
  return contract;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await verifyContractAccess(params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const workItems = await db.workItem.findMany({
      where: { contractId: params.contractId },
      include: {
        ksiNode: { select: { code: true, name: true } },
        _count: { select: { workRecords: true, materials: true } },
        materials: {
          select: { id: true, name: true, unit: true, quantityReceived: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(workItems);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения видов работ');
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
    const parsed = createWorkItemSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Проверка существования КСИ-узла (только если передан)
    if (parsed.data.ksiNodeId) {
      const ksiNode = await db.ksiNode.findUnique({ where: { id: parsed.data.ksiNodeId } });
      if (!ksiNode) return errorResponse('Узел КСИ не найден', 404);
    }

    const workItem = await db.workItem.create({
      data: {
        ...parsed.data,
        contractId: params.contractId,
      },
      include: {
        ksiNode: { select: { code: true, name: true } },
      },
    });

    return successResponse(workItem);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания вида работ');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
