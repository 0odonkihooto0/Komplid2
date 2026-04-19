import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  number: z.string().min(1).max(50),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  amount: z.number(),
  changeType: z.enum(['AMOUNT', 'TOTAL_AMOUNT']).default('AMOUNT'),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; contractId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const orders = await db.changeOrder.findMany({
      where: { contractId: params.contractId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(orders);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения доп. соглашений');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const contract = await db.contract.findFirst({
      where: { id: params.contractId, projectId: params.projectId },
    });
    if (!contract) return errorResponse('Договор не найден', 404);

    const body: unknown = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { changeType, ...orderData } = parsed.data;

    const order = await db.$transaction(async (tx) => {
      // Создаём доп. соглашение
      const created = await tx.changeOrder.create({
        data: {
          ...orderData,
          changeType,
          contractId: params.contractId,
          createdById: session.user.id,
        },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Обновляем сумму договора в зависимости от типа изменения
      let newTotal: number;
      if (changeType === 'TOTAL_AMOUNT') {
        // Заменяем общую сумму
        newTotal = orderData.amount;
      } else {
        // Прибавляем к текущей сумме
        newTotal = (contract.totalAmount ?? 0) + orderData.amount;
      }

      const newVatAmount = newTotal * (contract.vatRate ?? 0) / 100;

      await tx.contract.update({
        where: { id: params.contractId },
        data: { totalAmount: newTotal, vatAmount: newVatAmount },
      });

      return created;
    });

    return successResponse(order);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания доп. соглашения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
