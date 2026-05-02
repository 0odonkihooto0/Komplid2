import { createHash } from 'crypto';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Публичный эндпоинт — без аутентификации
// Возвращает агрегированную сводку по проекту для заказчика
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  // Защита от перебора: 60 запросов в минуту с одного IP
  const ip = getClientIp(request);
  if (!checkRateLimit(`portal:${ip}`, 60, 60000)) {
    return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
  }

  try {
    const portalToken = await db.projectPortalToken.findUnique({
      where: { token: params.token },
      include: {
        buildingObject: {
          include: {
            contracts: {
              select: {
                id: true,
                number: true,
                name: true,
                totalAmount: true,
                _count: {
                  select: {
                    executionDocs: true,
                    workItems: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!portalToken) {
      return NextResponse.json({ success: false, error: 'Ссылка недействительна' }, { status: 404 });
    }

    // Проверить отзыв токена
    if (portalToken.revokedAt) {
      return NextResponse.json({ error: 'Ссылка отозвана' }, { status: 410 });
    }

    // Проверить срок действия
    if (portalToken.expiresAt && new Date() > portalToken.expiresAt) {
      return NextResponse.json({ success: false, error: 'Ссылка устарела' }, { status: 410 });
    }

    // Поддерживаем только тип дашборда объекта
    if (portalToken.scopeType !== 'PROJECT_DASHBOARD') {
      return NextResponse.json({ success: false, error: 'Тип ссылки не поддерживается' }, { status: 403 });
    }

    const project = portalToken.buildingObject;

    // Извлекаем настройки видимости из customSettings
    const settings = (portalToken.customSettings as unknown as {
      hideCosts?: boolean;
      hidePhotoIds?: string[];
      hideAddress?: boolean;
      hideDefects?: boolean;
    }) ?? {};

    // Статистика ИД
    const [signedDocs, totalDocs] = await Promise.all([
      db.executionDoc.count({
        where: {
          status: 'SIGNED',
          contract: { projectId: project.id },
        },
      }),
      db.executionDoc.count({
        where: { contract: { projectId: project.id } },
      }),
    ]);

    // Критические дефекты (открытые) — скрываются если hideDefects = true
    const criticalDefects = settings.hideDefects
      ? []
      : await db.defect.findMany({
          where: {
            projectId: project.id,
            status: { in: ['OPEN', 'IN_PROGRESS'] },
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            deadline: true,
            category: true,
          },
        });

    // Последние 10 фото с учётом hidePhotoIds
    const rawPhotos = await db.photo.findMany({
      where: { author: { organizationId: project.organizationId } },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        s3Key: true,
        fileName: true,
        takenAt: true,
        createdAt: true,
      },
    });

    // Фильтруем скрытые фото по списку из customSettings
    const hidePhotoIds = settings.hidePhotoIds ?? [];
    const recentPhotos = hidePhotoIds.length > 0
      ? rawPhotos.filter((photo) => !hidePhotoIds.includes(photo.id))
      : rawPhotos;

    // Прогресс: подписанных актов / общего числа актов
    const progress = totalDocs > 0 ? Math.round((signedDocs / totalDocs) * 100) : 0;

    // Формируем адрес: если hideAddress — оставляем только первый элемент (город)
    const address = settings.hideAddress && project.address
      ? project.address.split(',')[0].trim()
      : project.address;

    // Формируем данные по договорам с учётом hideCosts
    const contracts = project.contracts.map((c) => ({
      id: c.id,
      number: c.number,
      name: c.name,
      docsCount: c._count.executionDocs,
      workItemsCount: c._count.workItems,
      // Сумма договора скрывается если hideCosts = true
      ...(settings.hideCosts ? {} : { totalAmount: c.totalAmount }),
    }));

    // Логируем ipHash для отладки (ФЗ-152: не храним IP напрямую)
    const dailySalt = new Date().toISOString().slice(0, 10);
    const ipHash = createHash('sha256').update((ip ?? 'unknown') + dailySalt).digest('hex');
    logger.debug({ ipHash }, 'Просмотр портала заказчика');

    return NextResponse.json({
      success: true,
      data: {
        projectId: project.id,
        projectName: project.name,
        address,
        generalContractor: project.generalContractor,
        customer: project.customer,
        progress,
        docStats: { signed: signedDocs, total: totalDocs },
        contracts,
        criticalDefects,
        recentPhotos,
        allowIndexing: portalToken.allowIndexing,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Ошибка получения данных портала заказчика');
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
