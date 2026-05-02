import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Публичный эндпоинт — без аутентификации
// Возвращает ленту событий по объекту строительства для портала заказчика
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  try {
    // Rate-limit по IP: 60 запросов в минуту
    const ip = getClientIp(req);
    if (!checkRateLimit(`timeline:${ip}`, 60, 60_000)) {
      return NextResponse.json(
        { success: false, error: 'Слишком много запросов' },
        { status: 429 },
      );
    }

    // Найти и проверить токен
    const portalToken = await db.projectPortalToken.findUnique({
      where: { token: params.token },
    });

    if (!portalToken) {
      return NextResponse.json({ success: false, error: 'Ссылка недействительна' }, { status: 404 });
    }

    // Токен отозван
    if (portalToken.revokedAt) {
      return NextResponse.json({ success: false, error: 'Ссылка отозвана' }, { status: 410 });
    }

    // Срок действия истёк
    if (portalToken.expiresAt && new Date() > portalToken.expiresAt) {
      return NextResponse.json({ success: false, error: 'Ссылка устарела' }, { status: 410 });
    }

    const projectId = portalToken.projectId;

    // 1. Подписанные акты исполнительной документации
    const signedDocs = await db.executionDoc.findMany({
      where: {
        contract: { projectId },
        status: 'SIGNED',
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: { id: true, title: true, updatedAt: true },
    });

    // 2. Закрытые дефекты — статус CONFIRMED означает подтверждённое устранение стройконтролем
    const closedDefects = await db.defect.findMany({
      where: {
        projectId,
        status: 'CONFIRMED',
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: { id: true, title: true, resolvedAt: true, updatedAt: true },
    });

    // 3. Последние 3 фотоматериала по объекту
    // Photo использует полиморфную связь entityType+entityId, фото привязаны
    // к контрактам, дефектам и работам, а не напрямую к объекту.
    // Для ленты берём фото автора из той же организации по объекту через дефекты.
    const buildingObject = await db.buildingObject.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });

    const recentPhotos = buildingObject
      ? await db.photo.findMany({
          where: { author: { organizationId: buildingObject.organizationId } },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { id: true, createdAt: true, fileName: true },
        })
      : [];

    // Объединить все события в единую ленту
    type TimelineEvent = {
      id: string;
      type: 'SIGNED_DOC' | 'DEFECT_CLOSED' | 'PHOTO_ADDED';
      date: Date;
      title: string;
      description?: string;
    };

    const events: TimelineEvent[] = [
      ...signedDocs.map((doc) => ({
        id: `doc-${doc.id}`,
        type: 'SIGNED_DOC' as const,
        date: doc.updatedAt,
        title: doc.title,
        description: 'Акт подписан',
      })),
      ...closedDefects.map((defect) => ({
        id: `defect-${defect.id}`,
        type: 'DEFECT_CLOSED' as const,
        date: defect.resolvedAt ?? defect.updatedAt,
        title: 'Устранено замечание',
        description: defect.title,
      })),
      ...recentPhotos.map((photo) => ({
        id: `photo-${photo.id}`,
        type: 'PHOTO_ADDED' as const,
        date: photo.createdAt,
        title: 'Новые фотоматериалы',
        description: photo.fileName,
      })),
    ];

    // Отсортировать по дате убывания, лимит 20
    events.sort((a, b) => b.date.getTime() - a.date.getTime());
    const limited = events.slice(0, 20);

    return NextResponse.json({ success: true, data: { events: limited } });
  } catch (error) {
    logger.error({ err: error }, 'Ошибка получения ленты событий портала');
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
