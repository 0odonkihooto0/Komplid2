import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const photo = await db.photo.findFirst({
      where: {
        id: params.photoId,
        author: { organizationId: session.user.organizationId },
      },
    });
    if (!photo) return errorResponse('Фото не найдено', 404);

    await db.photo.delete({ where: { id: params.photoId } });
    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления фото');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
