export const dynamic = 'force-dynamic';

import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse, successResponse, handleApiError } from '@/utils/api';
import { requireFeature } from '@/lib/subscriptions/require-feature';
import { FEATURE_CODES } from '@/lib/features/codes';
import { db } from '@/lib/db';
import { renderClaim } from '@/lib/customer/render-claim';
import type { ClaimType } from '@prisma/client';

// GET /api/customer/projects/[projectId]/claims — список претензий заказчика по проекту
export async function GET(
  _request: Request,
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

    // Проверяем наличие фичи шаблонов претензий в тарифном плане
    await requireFeature(ws.id, FEATURE_CODES.CUSTOMER_CLAIM_TEMPLATES);

    const claims = await db.customerClaim.findMany({
      where: { projectId: params.projectId, workspaceId: ws.id },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(claims);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/customer/projects/[projectId]/claims — создание претензии по шаблону
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

    // Проверяем наличие фичи шаблонов претензий в тарифном плане
    await requireFeature(ws.id, FEATURE_CODES.CUSTOMER_CLAIM_TEMPLATES);

    const body = await request.json() as {
      type?: ClaimType;
      title?: string;
      recipientName?: string;
      senderName?: string;
      senderAddress?: string;
      contractNumber?: string;
      contractDate?: string;
      issueDescription?: string;
      requestedAction?: string;
      deadline?: string;
    };

    const {
      type,
      title,
      recipientName,
      senderName,
      senderAddress,
      contractNumber,
      contractDate,
      issueDescription,
      requestedAction,
      deadline,
    } = body;

    if (!type) return errorResponse('Тип претензии обязателен', 400);
    if (!title) return errorResponse('Заголовок претензии обязателен', 400);
    if (!senderName) return errorResponse('Имя отправителя обязательно', 400);
    if (!issueDescription) return errorResponse('Описание проблемы обязательно', 400);
    if (!requestedAction) return errorResponse('Требуемое действие обязательно', 400);

    // Рендерим HTML-содержимое претензии через Handlebars-шаблон
    const content = await renderClaim(type, {
      recipientName: recipientName ?? '',
      senderName,
      senderAddress,
      contractNumber,
      contractDate,
      issueDescription,
      requestedAction,
      deadline,
      today: new Date().toLocaleDateString('ru-RU'),
    });

    const claim = await db.customerClaim.create({
      data: {
        workspaceId: ws.id,
        projectId: params.projectId,
        type,
        status: 'DRAFT',
        title,
        content,
        recipientName,
      },
    });

    return successResponse(claim);
  } catch (error) {
    return handleApiError(error);
  }
}
