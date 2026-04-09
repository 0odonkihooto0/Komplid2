import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createContractPaymentSchema } from '@/lib/validations/contract-payment';

export const dynamic = 'force-dynamic';

type Params = { objectId: string; contractId: string };

// Вспомогательная: проверить доступ к договору
async function findContract(projectId: string, contractId: string, organizationId: string) {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
  });
  if (!project) return null;

  return db.contract.findFirst({ where: { id: contractId, projectId } });
}

// Получить список платежей по договору
export async function GET(
  _req: NextRequest,
  { params }: { params: Params },
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.objectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const payments = await db.contractPayment.findMany({
      where: { contractId: params.contractId },
      orderBy: { paymentDate: 'asc' },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(payments);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения платежей по договору');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Добавить платёж (плановый или фактический)
export async function POST(
  req: NextRequest,
  { params }: { params: Params },
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.objectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const body = await req.json();
    const parsed = createContractPaymentSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { paymentDate, ...rest } = parsed.data;

    const payment = await db.contractPayment.create({
      data: {
        ...rest,
        paymentDate: new Date(paymentDate),
        contractId: params.contractId,
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(payment);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания платежа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
