import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { requireSystemAdmin } from '@/lib/permissions';
export const dynamic = 'force-dynamic';


// GET — список подозрительных рефералов (только для ADMIN)
export async function GET() {
  try {
    const session = await getSessionOrThrow();
    requireSystemAdmin(session);

    const suspicious = await db.referral.findMany({
      where: { suspicious: true, rewardStatus: { not: 'CANCELED' } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        referrerId: true,
        referredUserId: true,
        fraudReasons: true,
        rewardStatus: true,
        rewardAmountRub: true,
        signupAt: true,
        firstPaidAt: true,
        referrer: { select: { email: true, firstName: true, lastName: true } },
        referredUser: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(suspicious);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Ошибка сервера', 500);
  }
}

// POST — действие: confirm или cancel реферала
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    requireSystemAdmin(session);

    const body = await req.json() as { referralId: string; action: 'confirm' | 'cancel' };
    const { referralId, action } = body;
    if (!referralId || !action) return errorResponse('Некорректные данные', 400);

    if (action === 'confirm') {
      await db.referral.update({
        where: { id: referralId },
        data: { suspicious: false, fraudReasons: [] },
      });
    } else if (action === 'cancel') {
      await db.$transaction(async (tx) => {
        const referral = await tx.referral.findUnique({ where: { id: referralId } });
        if (!referral) return;

        await tx.referral.update({
          where: { id: referralId },
          data: { rewardStatus: 'CANCELED' },
        });

        // Если бонус уже был выдан — создаём отрицательную запись в ledger
        if (referral.rewardStatus === 'GRANTED' && referral.rewardAmountRub > 0) {
          const refererWs = await tx.workspace.findFirst({
            where: { ownerId: referral.referrerId, type: 'PERSONAL' },
            include: { credit: true },
          });

          if (refererWs?.credit) {
            await tx.workspaceCredit.update({
              where: { workspaceId: refererWs.id },
              data: { balanceRub: { decrement: referral.rewardAmountRub } },
            });
            await tx.creditLedgerEntry.create({
              data: {
                creditId: refererWs.credit.id,
                amountRub: -referral.rewardAmountRub,
                type: 'MANUAL_ADJUSTMENT',
                description: `Отмена реферального бонуса (фрод-модерация): ${referralId}`,
                referralId,
              },
            });
          }
        }
      });
    }

    return successResponse({ ok: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Ошибка сервера', 500);
  }
}
