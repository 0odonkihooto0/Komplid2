export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse, handleApiError } from '@/utils/api';

type Params = { params: { projectId: string } };

const patchProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
});

/** Получить воркспейс текущего пользователя или вернуть 403 */
async function getOwnerWorkspace(activeWorkspaceId: string | null, userId: string) {
  if (!activeWorkspaceId) return null;
  return db.workspace.findFirst({
    where: { id: activeWorkspaceId, ownerId: userId },
  });
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем, что у пользователя есть личный воркспейс (владелец)
    const ws = await getOwnerWorkspace(session.user.activeWorkspaceId, session.user.id);
    if (!ws) return errorResponse('Доступ запрещён', 403);

    // Проверяем принадлежность проекта воркспейсу (мультитенантная изоляция)
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, workspaceId: ws.id },
    });
    if (!project) return errorResponse('Не найдено', 404);

    return successResponse(project);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем, что у пользователя есть личный воркспейс (владелец)
    const ws = await getOwnerWorkspace(session.user.activeWorkspaceId, session.user.id);
    if (!ws) return errorResponse('Доступ запрещён', 403);

    // Проверяем принадлежность проекта воркспейсу (мультитенантная изоляция)
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, workspaceId: ws.id },
    });
    if (!project) return errorResponse('Не найдено', 404);

    const body = await req.json().catch(() => ({}));
    const parsed = patchProjectSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Обновляем только переданные поля
    const updated = await db.buildingObject.update({
      where: { id: params.projectId },
      data: parsed.data,
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем, что у пользователя есть личный воркспейс (владелец)
    const ws = await getOwnerWorkspace(session.user.activeWorkspaceId, session.user.id);
    if (!ws) return errorResponse('Доступ запрещён', 403);

    // Проверяем принадлежность проекта воркспейсу (мультитенантная изоляция)
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, workspaceId: ws.id },
    });
    if (!project) return errorResponse('Не найдено', 404);

    // Мягкое удаление: переводим в статус ARCHIVED (данные сохраняются)
    await db.buildingObject.update({
      where: { id: params.projectId },
      data: { status: 'ARCHIVED' },
    });

    return successResponse({ archived: true });
  } catch (error) {
    return handleApiError(error);
  }
}
