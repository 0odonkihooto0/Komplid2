import { db } from '@/lib/db';
import { getDownloadUrl } from '@/lib/s3-utils';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Публичный эндпоинт — фотогалерея объекта с cursor-based пагинацией
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`photos:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
  }

  try {
    const portalToken = await db.projectPortalToken.findUnique({
      where: { token: params.token },
      select: {
        id: true, projectId: true, revokedAt: true, expiresAt: true, customSettings: true,
        buildingObject: { select: { organizationId: true } },
      },
    });

    if (!portalToken) {
      return NextResponse.json({ error: 'Ссылка недействительна' }, { status: 404 });
    }
    if (portalToken.revokedAt) {
      return NextResponse.json({ error: 'Ссылка отозвана' }, { status: 410 });
    }
    if (portalToken.expiresAt && new Date() > portalToken.expiresAt) {
      return NextResponse.json({ error: 'Ссылка устарела' }, { status: 410 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50);
    const cursor = searchParams.get('cursor') ?? undefined;

    const settings = (portalToken.customSettings as unknown as {
      hidePhotoIds?: string[];
      hideDefects?: boolean;
    }) ?? {};

    const hidePhotoIds = Array.isArray(settings.hidePhotoIds) ? settings.hidePhotoIds : [];
    const orgId = portalToken.buildingObject.organizationId;

    // Photo привязаны полиморфно (entityType+entityId), фильтруем по автору организации
    const photos = await db.photo.findMany({
      where: {
        author: { organizationId: orgId },
        ...(hidePhotoIds.length > 0 ? { id: { notIn: hidePhotoIds } } : {}),
        ...(settings.hideDefects ? { category: { not: 'VIOLATION' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, s3Key: true, takenAt: true, gpsLat: true, gpsLng: true, category: true },
    });

    const hasNext = photos.length > limit;
    if (hasNext) photos.pop();

    // Генерируем pre-signed URL для каждого фото (TTL 1 час)
    const items = await Promise.all(
      photos.map(async (p) => ({
        id: p.id,
        downloadUrl: await getDownloadUrl(p.s3Key),
        takenAt: p.takenAt,
        gpsLat: p.gpsLat,
        gpsLng: p.gpsLng,
      })),
    );

    return NextResponse.json({
      success: true,
      data: {
        items,
        nextCursor: hasNext ? photos[photos.length - 1]?.id : undefined,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Ошибка загрузки фотогалереи портала');
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
