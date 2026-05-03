export const dynamic = 'force-dynamic';

import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse, successResponse, handleApiError } from '@/utils/api';
import { requireFeature } from '@/lib/subscriptions/require-feature';
import { FEATURE_CODES } from '@/lib/features/codes';
import { db } from '@/lib/db';

// GET /api/customer/projects/[projectId]/materials — постраничный список материалов заказчика
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

    // Проверяем наличие фичи трекера материалов в тарифном плане
    await requireFeature(ws.id, FEATURE_CODES.CUSTOMER_MATERIALS_TRACKER);

    const { searchParams } = new URL(request.url);
    const take = Math.min(Number(searchParams.get('limit') ?? '20'), 50);
    const skip = Number(searchParams.get('skip') ?? '0');

    const [materials, total] = await db.$transaction([
      db.customerMaterial.findMany({
        where: { projectId: params.projectId, workspaceId: ws.id },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      db.customerMaterial.count({
        where: { projectId: params.projectId, workspaceId: ws.id },
      }),
    ]);

    return successResponse({ materials, total });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/customer/projects/[projectId]/materials — создание записи о материале
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

    // Проверяем наличие фичи трекера материалов в тарифном плане
    await requireFeature(ws.id, FEATURE_CODES.CUSTOMER_MATERIALS_TRACKER);

    const body = await request.json() as {
      name?: string;
      unit?: string;
      quantity?: number;
      priceRub?: number;
      totalRub?: number;
      supplier?: string;
      notes?: string;
    };

    const { name, unit, quantity, priceRub, totalRub, supplier, notes } = body;

    if (!name) return errorResponse('Наименование материала обязательно', 400);
    if (!unit) return errorResponse('Единица измерения обязательна', 400);
    if (quantity === undefined || quantity === null) return errorResponse('Количество обязательно', 400);
    if (priceRub === undefined || priceRub === null) return errorResponse('Цена за единицу обязательна', 400);
    if (totalRub === undefined || totalRub === null) return errorResponse('Итоговая сумма обязательна', 400);

    // priceRub и totalRub передаются в копейках (целые числа)
    const material = await db.customerMaterial.create({
      data: {
        workspaceId: ws.id,
        projectId: params.projectId,
        name,
        unit,
        quantity,
        priceRub,
        totalRub,
        supplier,
        notes,
      },
    });

    return successResponse(material);
  } catch (error) {
    return handleApiError(error);
  }
}
