import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/utils/api';
export const dynamic = 'force-dynamic';


// GET /api/referrals/leaderboard — публичный топ рефереров (без точных сумм)
export async function GET() {
  try {
    const codes = await db.referralCode.findMany({
      where: { paidCount: { gt: 0 } },
      orderBy: { paidCount: 'desc' },
      take: 20,
      select: {
        paidCount: true,
        signupCount: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            professionalRole: true,
          },
        },
      },
    });

    const entries = codes.map((c, i) => ({
      rank: i + 1,
      firstName: c.user.firstName,
      lastNameInitial: c.user.lastName.charAt(0),
      professionalRole: c.user.professionalRole,
      paidCount: c.paidCount,
      signupCount: c.signupCount,
      badge: i === 0 ? 'Супер-партнёр' : i === 1 ? 'Топ-партнёр' : i < 5 ? 'Активный' : null,
    }));

    return successResponse(entries);
  } catch {
    return errorResponse('Ошибка сервера', 500);
  }
}
