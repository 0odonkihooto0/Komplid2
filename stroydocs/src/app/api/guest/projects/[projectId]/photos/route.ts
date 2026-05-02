import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { guestScopeSchema } from '@/types/guest-scope';
import { getDownloadUrl } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка что пользователь — активный гость
    const member = await db.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: session.user.activeWorkspaceId!,
      },
      select: { role: true, guestScope: true },
    });

    if (!member || member.role !== 'GUEST') {
      return errorResponse('Нет доступа', 403);
    }

    const scope = guestScopeSchema.parse(member.guestScope);

    // Проверка разрешения на просмотр фото
    if (!scope.permissions.canViewPhotos) {
      return errorResponse('Просмотр фотографий запрещён', 403);
    }

    // Проверка доступа к конкретному объекту
    if (!scope.allowedProjectIds.includes(params.projectId)) {
      return errorResponse('Нет доступа к этому объекту', 403);
    }

    // Параметры пагинации
    const url = new URL(req.url);
    const rawLimit = parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
    const limit = Math.min(isNaN(rawLimit) || rawLimit < 1 ? DEFAULT_LIMIT : rawLimit, MAX_LIMIT);
    const cursor = url.searchParams.get('cursor') ?? undefined;

    // Фото привязаны к контрактам — получаем ID контрактов проекта
    const contracts = await db.contract.findMany({
      where: { projectId: params.projectId },
      select: { id: true },
    });
    const contractIds = contracts.map((c) => c.id);

    // Запрашиваем фото, привязанные к контрактам проекта (entityType: CONTRACT)
    // и берём на 1 больше для определения nextCursor
    const photos = await db.photo.findMany({
      where: {
        entityType: 'CONTRACT',
        entityId: { in: contractIds },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1, // пропускаем сам курсор
          }
        : {}),
      select: {
        id: true,
        s3Key: true,
        takenAt: true,
        gpsLat: true,
        gpsLng: true,
        category: true,
        createdAt: true,
      },
    });

    // Определяем следующий курсор
    let nextCursor: string | null = null;
    const hasMore = photos.length > limit;
    if (hasMore) {
      photos.pop(); // убираем лишний элемент
      nextCursor = photos[photos.length - 1]?.id ?? null;
    }

    // Генерируем pre-signed URL для каждого фото
    const items = await Promise.all(
      photos.map(async (photo) => {
        const downloadUrl = await getDownloadUrl(photo.s3Key);
        return {
          id: photo.id,
          downloadUrl,
          takenAt: photo.takenAt,
          gpsLat: photo.gpsLat,
          gpsLng: photo.gpsLng,
          category: photo.category,
          createdAt: photo.createdAt,
        };
      })
    );

    return successResponse({ items, nextCursor });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения фотографий для гостя');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
