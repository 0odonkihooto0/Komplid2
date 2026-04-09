import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Качество ИД: подписанные / всего актов по организации
export async function GET() {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const [signed, total] = await Promise.all([
      db.executionDoc.count({
        where: {
          status: 'SIGNED',
          contract: { buildingObject: { organizationId: orgId } },
        },
      }),
      db.executionDoc.count({
        where: { contract: { buildingObject: { organizationId: orgId } } },
      }),
    ]);

    // Статистика по типам ИД
    const byType = await db.executionDoc.groupBy({
      by: ['type'],
      where: { contract: { buildingObject: { organizationId: orgId } } },
      _count: { id: true },
    });

    const byStatus = await db.executionDoc.groupBy({
      by: ['status'],
      where: { contract: { buildingObject: { organizationId: orgId } } },
      _count: { id: true },
    });

    return successResponse({
      signed,
      total,
      ratio: total > 0 ? Math.round((signed / total) * 100) : 0,
      byType: byType.map((r) => ({ type: r.type, count: r._count.id })),
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count.id })),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения качества ИД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
