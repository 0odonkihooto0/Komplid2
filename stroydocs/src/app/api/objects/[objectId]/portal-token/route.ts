import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// GET — получить текущий токен портала (или null)
export async function GET(
  _req: NextRequest,
  { params }: { params: { objectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const token = await db.projectPortalToken.findFirst({
      where: { projectId: params.objectId },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(token ?? null);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения токена портала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// POST — создать новый токен (если уже есть — вернуть существующий)
export async function POST(
  _req: NextRequest,
  { params }: { params: { objectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Если токен уже существует — вернуть его
    const existing = await db.projectPortalToken.findFirst({
      where: { projectId: params.objectId },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return successResponse(existing);

    const token = await db.projectPortalToken.create({
      data: {
        token: randomUUID(),
        projectId: params.objectId,
        createdById: session.user.id,
      },
    });

    return successResponse(token);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания токена портала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// DELETE — отозвать токен
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { objectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    await db.projectPortalToken.deleteMany({
      where: { projectId: params.objectId },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления токена портала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
