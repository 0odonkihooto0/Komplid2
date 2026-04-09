import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Публичный эндпоинт — без аутентификации
// Возвращает агрегированную сводку по проекту для заказчика
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
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

    // Проверить срок действия
    if (portalToken.expiresAt && new Date() > portalToken.expiresAt) {
      return NextResponse.json({ success: false, error: 'Ссылка устарела' }, { status: 410 });
    }

    const project = portalToken.buildingObject;

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

    // Критические дефекты (открытые)
    const criticalDefects = await db.defect.findMany({
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

    // Последние 10 фото
    const recentPhotos = await db.photo.findMany({
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

    // Прогресс: подписанных актов / общего числа актов
    const progress = totalDocs > 0 ? Math.round((signedDocs / totalDocs) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        projectId: project.id,
        projectName: project.name,
        address: project.address,
        generalContractor: project.generalContractor,
        customer: project.customer,
        progress,
        docStats: { signed: signedDocs, total: totalDocs },
        contracts: project.contracts.map((c) => ({
          id: c.id,
          number: c.number,
          name: c.name,
          docsCount: c._count.executionDocs,
          workItemsCount: c._count.workItems,
        })),
        criticalDefects,
        recentPhotos,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Ошибка получения данных портала заказчика');
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
