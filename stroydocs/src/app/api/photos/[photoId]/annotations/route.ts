import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем, что фото принадлежит организации пользователя
    const photo = await db.photo.findFirst({
      where: {
        id: params.photoId,
        author: { organizationId: session.user.organizationId },
      },
    });

    if (!photo) return errorResponse('Фото не найдено', 404);

    const body = await req.json();
    const { annotations } = body;

    if (annotations === undefined) {
      return errorResponse('Поле annotations обязательно', 400);
    }

    const updated = await db.photo.update({
      where: { id: params.photoId },
      data: { annotations },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка сохранения аннотаций');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
