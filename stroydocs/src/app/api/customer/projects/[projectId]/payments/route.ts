export const dynamic = 'force-dynamic';

import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse, successResponse, handleApiError } from '@/utils/api';
import { requireFeature } from '@/lib/subscriptions/require-feature';
import { FEATURE_CODES } from '@/lib/features/codes';
import { db } from '@/lib/db';
import type { CustomerPaymentCategory } from '@prisma/client';

// GET /api/customer/projects/[projectId]/payments — постраничный список платежей заказчика
export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем принадлежность воркспейса текущему пользователю
    const ws = await db.workspace.findFirst({
      where: { id: session.user.activeWorkspaceId!, ownerId: session.user.id },
    });
    if (!ws) return errorResponse('Доступ запрещён', 403);

    // Проверяем принадлежность проекта воркспейсу (multi-tenancy)
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, workspaceId: ws.id },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверяем наличие фичи трекера платежей в тарифном плане
    await requireFeature(ws.id, FEATURE_CODES.CUSTOMER_PAYMENT_TRACKER);

    const { searchParams } = new URL(request.url);
    const take = Math.min(Number(searchParams.get('limit') ?? '20'), 50);
    const skip = Number(searchParams.get('skip') ?? '0');

    const [payments, total] = await db.$transaction([
      db.customerPayment.findMany({
        where: { projectId: params.projectId, workspaceId: ws.id },
        orderBy: { date: 'desc' },
        take,
        skip,
      }),
      db.customerPayment.count({
        where: { projectId: params.projectId, workspaceId: ws.id },
      }),
    ]);

    return successResponse({ payments, total });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/customer/projects/[projectId]/payments — создание записи о платеже
export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем принадлежность воркспейса текущему пользователю
    const ws = await db.workspace.findFirst({
      where: { id: session.user.activeWorkspaceId!, ownerId: session.user.id },
    });
    if (!ws) return errorResponse('Доступ запрещён', 403);

    // Проверяем принадлежность проекта воркспейсу (multi-tenancy)
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, workspaceId: ws.id },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверяем наличие фичи трекера платежей в тарифном плане
    await requireFeature(ws.id, FEATURE_CODES.CUSTOMER_PAYMENT_TRACKER);

    const body = await request.json() as {
      category?: CustomerPaymentCategory;
      amountRub?: number;
      date?: string;
      description?: string;
      contractRef?: string;
      isPaid?: boolean;
    };

    const { category, amountRub, date, description, contractRef, isPaid } = body;

    if (!category) return errorResponse('Категория платежа обязательна', 400);
    if (amountRub === undefined || amountRub === null) return errorResponse('Сумма платежа обязательна', 400);
    if (!date) return errorResponse('Дата платежа обязательна', 400);
    if (!description) return errorResponse('Описание платежа обязательно', 400);

    // amountRub передаётся в копейках (целое число)
    const payment = await db.customerPayment.create({
      data: {
        workspaceId: ws.id,
        projectId: params.projectId,
        category,
        amountRub,
        date: new Date(date),
        description,
        contractRef,
        isPaid: isPaid ?? false,
      },
    });

    return successResponse(payment);
  } catch (error) {
    return handleApiError(error);
  }
}
