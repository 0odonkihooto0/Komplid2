import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { ensureReferralCode } from '@/lib/referrals/generate-code';

// GET — мой реферальный код + статистика
export async function GET() {
  try {
    const session = await getSessionOrThrow();
    const userId = session.user.id;

    const code = await ensureReferralCode(userId);

    const stats = await db.referralCode.findUnique({
      where: { userId },
      select: {
        code: true,
        clickCount: true,
        signupCount: true,
        paidCount: true,
        referrals: {
          where: { rewardStatus: 'GRANTED' },
          select: { rewardAmountRub: true },
        },
      },
    });

    const totalBonusRub = stats?.referrals.reduce((s, r) => s + r.rewardAmountRub, 0) ?? 0;

    // Баланс кредита PERSONAL workspace
    const personalWs = await db.workspace.findFirst({
      where: { ownerId: userId, type: 'PERSONAL' },
      include: { credit: { select: { balanceRub: true } } },
    });

    return successResponse({
      code,
      clickCount: stats?.clickCount ?? 0,
      signupCount: stats?.signupCount ?? 0,
      paidCount: stats?.paidCount ?? 0,
      totalBonusRub,
      creditBalanceRub: personalWs?.credit?.balanceRub ?? 0,
      shareUrl: `${process.env.APP_URL ?? ''}/ref/${code}`,
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Ошибка сервера', 500);
  }
}

// POST — явно создать/получить реферальный код (если не создан автоматически)
export async function POST() {
  try {
    const session = await getSessionOrThrow();
    const code = await ensureReferralCode(session.user.id);
    return successResponse({ code });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Ошибка сервера', 500);
  }
}
