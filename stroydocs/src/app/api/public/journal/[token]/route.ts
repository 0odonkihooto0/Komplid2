import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`public-journal:${params.token}:${ip}`, 100, 60 * 1000)) {
    return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
  }

  const journal = await db.specialJournal.findUnique({
    where: { publicShareToken: params.token },
    select: {
      id: true,
      type: true,
      number: true,
      title: true,
      status: true,
      openedAt: true,
      publicShareExpiresAt: true,
      publicShareViewCount: true,
      responsible: { select: { firstName: true, lastName: true } },
      project: { select: { name: true } },
      entries: {
        orderBy: { date: 'desc' },
        take: 20,
        select: {
          id: true,
          date: true,
          entryNumber: true,
          description: true,
          location: true,
        },
      },
    },
  });

  if (!journal) {
    return NextResponse.json({ error: 'Не найдено' }, { status: 404 });
  }

  if (journal.publicShareExpiresAt && new Date() > journal.publicShareExpiresAt) {
    return NextResponse.json({ error: 'Ссылка недействительна' }, { status: 410 });
  }

  // Инкрементируем счётчик просмотров (fire-and-forget)
  db.specialJournal
    .update({
      where: { id: journal.id },
      data: { publicShareViewCount: journal.publicShareViewCount + 1 },
    })
    .catch(() => void 0);

  return NextResponse.json({ success: true, data: journal });
}
