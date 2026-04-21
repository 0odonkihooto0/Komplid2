import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
export const dynamic = 'force-dynamic';


// GET — список моих рефералов
export async function GET() {
  try {
    const session = await getSessionOrThrow();
    const userId = session.user.id;

    const referrals = await db.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        referredRole: true,
        isCrossRole: true,
        signupAt: true,
        firstPaidAt: true,
        rewardStatus: true,
        rewardAmountRub: true,
        discountAmountRub: true,
        referredUser: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(
      referrals.map((r) => ({
        id: r.id,
        referredEmail: r.referredUser?.email ?? null,
        referredName: r.referredUser
          ? `${r.referredUser.firstName} ${r.referredUser.lastName}`
          : null,
        referredRole: r.referredRole,
        isCrossRole: r.isCrossRole,
        signupAt: r.signupAt,
        firstPaidAt: r.firstPaidAt,
        rewardStatus: r.rewardStatus,
        rewardAmountRub: r.rewardAmountRub,
        discountAmountRub: r.discountAmountRub,
      }))
    );
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Ошибка сервера', 500);
  }
}
