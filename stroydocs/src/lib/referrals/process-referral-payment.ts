import type { Payment } from '@prisma/client';
import type { PrismaTx } from '@/lib/db';
import { calculateReferralReward } from './calculate-reward';

// Вызывается из webhook ЮKassa при payment.succeeded (внутри db.$transaction)
export async function processReferralReward(tx: PrismaTx, payment: Payment): Promise<void> {
  if (!payment.referralId) return;

  const referral = await tx.referral.findUnique({
    where: { id: payment.referralId },
    include: { referrer: { select: { id: true } } },
  });
  if (!referral) return;
  if (referral.firstPaidAt) return; // идемпотентность — уже обработан

  const reward = calculateReferralReward({
    referrerRole: referral.referrerRole,
    referredRole: referral.referredRole,
    firstPaymentAmountRub: payment.amountRub,
  });

  // 1. Обновить referral — зафиксировать первый платёж и награду
  await tx.referral.update({
    where: { id: referral.id },
    data: {
      firstPaidAt: new Date(),
      firstPaymentAmountRub: payment.amountRub,
      firstPaymentId: payment.id,
      rewardType: 'CREDIT',
      rewardAmountRub: reward.referrerCreditRub,
      rewardStatus: 'GRANTED',
      rewardGrantedAt: new Date(),
      isCrossRole: reward.isCrossRole,
    },
  });

  // 2. Инкрементировать paidCount реферального кода
  await tx.referralCode.update({
    where: { id: referral.codeId },
    data: { paidCount: { increment: 1 } },
  });

  // 3. Начислить кредит в PERSONAL workspace реферера
  const referrerPersonalWs = await tx.workspace.findFirst({
    where: { ownerId: referral.referrerId, type: 'PERSONAL' },
  });

  if (referrerPersonalWs) {
    const credit = await tx.workspaceCredit.upsert({
      where: { workspaceId: referrerPersonalWs.id },
      create: { workspaceId: referrerPersonalWs.id, balanceRub: reward.referrerCreditRub },
      update: { balanceRub: { increment: reward.referrerCreditRub } },
    });

    await tx.creditLedgerEntry.create({
      data: {
        creditId: credit.id,
        amountRub: reward.referrerCreditRub,
        type: 'REFERRAL_BONUS',
        description:
          `Реферальный бонус: приглашённый ${referral.referredRole ?? '?'} оплатил подписку` +
          (reward.isCrossRole ? ' (кросс-роль ×90%)' : ' (×50%)'),
        referralId: referral.id,
        paymentId: payment.id,
      },
    });
  }

  // 4. Уведомление рефереру
  await tx.notification.create({
    data: {
      userId: referral.referrerId,
      type: 'REFERRAL_REWARD',
      title: `Вам начислено ${Math.floor(reward.referrerCreditRub / 100)} ₽`,
      body: `Ваш реферал оформил подписку. Бонус зачислен на ваш Личный workspace.`,
    },
  });
}
