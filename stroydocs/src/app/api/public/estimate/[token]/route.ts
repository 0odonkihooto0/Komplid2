import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`public-estimate:${params.token}:${ip}`, 60, 60 * 1000)) {
    return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
  }

  const version = await db.estimateVersion.findUnique({
    where: { publicShareToken: params.token },
    select: {
      id: true,
      name: true,
      totalAmount: true,
      totalLabor: true,
      totalMat: true,
      publicShareMode: true,
      publicShareExpiresAt: true,
      publicShareViewCount: true,
      createdAt: true,
      contract: {
        select: {
          id: true,
          number: true,
          buildingObject: { select: { name: true } },
        },
      },
      chapters: {
        select: {
          id: true,
          name: true,
          code: true,
          order: true,
          level: true,
          items: {
            select: {
              id: true,
              name: true,
              unit: true,
              volume: true,
              unitPrice: true,
              totalPrice: true,
              sortOrder: true,
            },
            orderBy: { sortOrder: 'asc' },
            take: 200,
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!version) {
    return NextResponse.json({ error: 'Ссылка недействительна' }, { status: 404 });
  }

  if (version.publicShareExpiresAt && new Date() > version.publicShareExpiresAt) {
    return NextResponse.json({ error: 'Срок действия ссылки истёк' }, { status: 410 });
  }

  // Инкрементировать счётчик просмотров (fire-and-forget)
  db.estimateVersion
    .update({
      where: { publicShareToken: params.token },
      data: { publicShareViewCount: { increment: 1 } },
    })
    .catch(() => {});

  return NextResponse.json({ success: true, data: version });
}
