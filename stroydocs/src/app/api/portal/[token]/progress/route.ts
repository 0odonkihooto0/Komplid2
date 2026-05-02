import { db } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Публичный эндпоинт — временной ряд прогресса ИД для графика заказчика
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`progress:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
  }

  try {
    const portalToken = await db.projectPortalToken.findUnique({
      where: { token: params.token },
      select: { projectId: true, revokedAt: true, expiresAt: true },
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

    const projectId = portalToken.projectId;

    // Получаем все подписанные акты ИД, отсортированные по дате подписания
    const [signedDocs, total] = await Promise.all([
      db.executionDoc.findMany({
        where: { contract: { projectId }, status: 'SIGNED' },
        orderBy: { updatedAt: 'asc' },
        select: { id: true, updatedAt: true },
      }),
      db.executionDoc.count({ where: { contract: { projectId } } }),
    ]);

    // Строим кумулятивный ряд по дням (упрощённо — дата последнего обновления акта)
    const dayMap = new Map<string, number>();
    for (const doc of signedDocs) {
      const day = doc.updatedAt.toISOString().slice(0, 10);
      dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
    }

    let cumulative = 0;
    const points = Array.from(dayMap.entries()).map(([date, count]) => {
      cumulative += count;
      return {
        date,
        signedDocs: cumulative,
        percent: total > 0 ? Math.round((cumulative / total) * 100) : 0,
      };
    });

    return NextResponse.json({ success: true, data: { points, total } });
  } catch (error) {
    logger.error({ err: error }, 'Ошибка загрузки прогресса портала');
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
