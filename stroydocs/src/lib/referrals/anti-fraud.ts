import { db } from '@/lib/db';

interface FraudCheckInput {
  referrerId: string;
  referredEmail: string;
  referrerEmail: string;
  signupIp: string;
  referrerIp?: string;
}

export interface FraudCheckResult {
  suspicious: boolean;
  reasons: string[];
}

// Проверяем подозрительные рефералы
export async function checkReferralFraud(input: FraudCheckInput): Promise<FraudCheckResult> {
  const reasons: string[] = [];

  // 1. Лимит signup с одного IP за 7 дней
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sameIpSignups = await db.referral.count({
    where: {
      signupIp: input.signupIp,
      signupAt: { gte: sevenDaysAgo },
    },
  });
  if (sameIpSignups >= 3) {
    reasons.push(`Слишком много регистраций с IP ${input.signupIp} за 7 дней (${sameIpSignups + 1})`);
  }

  // 2. Совпадение домена email (кроме gmail/yandex/mail)
  const COMMON_DOMAINS = ['gmail.com', 'yandex.ru', 'mail.ru', 'outlook.com', 'hotmail.com', 'rambler.ru'];
  const referrerDomain = input.referrerEmail.split('@')[1]?.toLowerCase() ?? '';
  const referredDomain = input.referredEmail.split('@')[1]?.toLowerCase() ?? '';
  if (
    referrerDomain === referredDomain &&
    !COMMON_DOMAINS.includes(referredDomain)
  ) {
    reasons.push(`Одинаковый корпоративный домен: ${referredDomain}`);
  }

  // 3. IP-подсеть /24 совпадение
  if (input.referrerIp) {
    const referrerSubnet = input.referrerIp.split('.').slice(0, 3).join('.');
    const signupSubnet = input.signupIp.split('.').slice(0, 3).join('.');
    if (referrerSubnet && referrerSubnet === signupSubnet) {
      reasons.push(`Одинаковая IP-подсеть /24: ${referrerSubnet}.x`);
    }
  }

  // 4. Лимит 10 GRANTED рефералов в месяц у реферера
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const grantedThisMonth = await db.referral.count({
    where: {
      referrerId: input.referrerId,
      rewardStatus: 'GRANTED',
      rewardGrantedAt: { gte: oneMonthAgo },
    },
  });
  if (grantedThisMonth >= 10) {
    reasons.push(`Превышен лимит 10 выданных наград в месяц у реферера (${grantedThisMonth})`);
  }

  return { suspicious: reasons.length > 0, reasons };
}

// Сканирование рефералов за последние 24 часа для cron-задачи
export async function scanRecentReferrals(): Promise<{ scanned: number; flagged: number }> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recent = await db.referral.findMany({
    where: {
      signupAt: { gte: oneDayAgo },
      suspicious: false,
      referredUserId: { not: null },
    },
    include: {
      referrer: { select: { email: true } },
      referredUser: { select: { email: true } },
      code: { select: { userId: true } },
    },
  });

  let flagged = 0;

  for (const ref of recent) {
    if (!ref.referredUser) continue;

    const result = await checkReferralFraud({
      referrerId: ref.referrerId,
      referredEmail: ref.referredUser.email,
      referrerEmail: ref.referrer.email,
      signupIp: ref.signupIp ?? '',
    });

    if (result.suspicious) {
      await db.referral.update({
        where: { id: ref.id },
        data: {
          suspicious: true,
          fraudReasons: result.reasons,
        },
      });
      flagged++;
    }
  }

  return { scanned: recent.length, flagged };
}
