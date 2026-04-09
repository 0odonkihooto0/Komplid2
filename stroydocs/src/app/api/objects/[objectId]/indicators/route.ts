import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// Агрегированные показатели объекта для вкладки «Показатели» (Модуль 2)
export async function GET(
  _req: NextRequest,
  { params }: { params: { objectId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const organizationId = session.user.organizationId;

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Список договоров объекта — используем для подзапросов
    const contracts = await db.contract.findMany({
      where: { projectId: params.objectId },
      select: { id: true },
    });
    const contractIds = contracts.map((c) => c.id);

    const [totalWorkRecords, docsData, ks2Data] = await Promise.all([
      // Всего записей о работах по всем договорам объекта
      db.workRecord.count({
        where: { contractId: { in: contractIds } },
      }),

      // Исполнительные документы сгруппированные по статусу
      db.executionDoc.groupBy({
        by: ['status'],
        where: { contractId: { in: contractIds } },
        _count: { id: true },
      }),

      // Сумма по актам КС-2
      db.ks2Act.aggregate({
        where: { contractId: { in: contractIds } },
        _sum: { totalAmount: true },
      }),
    ]);

    // Подсчёт документов по статусам
    const docsMap: Record<string, number> = {};
    for (const row of docsData) {
      docsMap[row.status] = row._count.id;
    }
    const totalDocs   = Object.values(docsMap).reduce((a, b) => a + b, 0);
    const signedDocs  = docsMap['SIGNED'] ?? 0;
    const idReadinessPercent = totalDocs > 0
      ? Math.round((signedDocs / totalDocs) * 100)
      : 0;

    return successResponse({
      totalContracts:      contracts.length,
      totalWorkRecords,
      totalDocs,
      signedDocs,
      idReadinessPercent,
      totalKs2Amount:      ks2Data._sum.totalAmount ?? 0,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения показателей объекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
