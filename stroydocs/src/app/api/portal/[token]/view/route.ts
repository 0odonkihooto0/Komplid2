import { createHash } from 'crypto';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Публичный эндпоинт — фиксирует просмотр публичного дашборда.
// Вызывается клиентом при открытии страницы портала.
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  const ip = getClientIp(request);

  // Хэшируем IP с дневной солью для ФЗ-152 совместимости (не храним IP напрямую)
  const dailySalt = new Date().toISOString().slice(0, 10);
  const ipHash = createHash('sha256').update((ip ?? 'unknown') + dailySalt).digest('hex');

  // Анти-спам: не более 1 view per token+ipHash за 5 минут
  if (!checkRateLimit(`view:${params.token}:${ipHash}`, 1, 5 * 60 * 1000)) {
    // Возвращаем 200 (not 429) чтобы не раскрывать механику rate-limit клиенту
    return NextResponse.json({ ok: true });
  }

  try {
    const token = await db.projectPortalToken.findUnique({
      where: { token: params.token },
      select: { id: true, revokedAt: true, expiresAt: true },
    });

    if (!token) {
      return NextResponse.json({ error: 'Токен не найден' }, { status: 404 });
    }

    // Проверяем что токен не отозван и не истёк
    if (token.revokedAt) {
      return NextResponse.json({ error: 'Ссылка отозвана' }, { status: 410 });
    }
    if (token.expiresAt && new Date() > token.expiresAt) {
      return NextResponse.json({ error: 'Ссылка устарела' }, { status: 410 });
    }

    const userAgent = request.headers.get('user-agent') ?? undefined;
    const referer = request.headers.get('referer') ?? undefined;

    // Создаём запись просмотра и инкрементируем счётчик атомарно
    await db.$transaction([
      db.portalView.create({
        data: {
          id: crypto.randomUUID(),
          tokenId: token.id,
          ipHash,
          userAgent,
          referer,
        },
      }),
      db.projectPortalToken.update({
        where: { id: token.id },
        data: {
          viewCount: { increment: 1 },
          lastViewedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ err: error }, 'Ошибка фиксации просмотра портала');
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
