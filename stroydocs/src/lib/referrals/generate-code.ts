import { db } from '@/lib/db';

const ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LEN = 10;

function generateRaw(): string {
  let result = '';
  for (let i = 0; i < CODE_LEN; i++) {
    result += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return result;
}

export async function ensureReferralCode(userId: string): Promise<string> {
  const existing = await db.referralCode.findUnique({ where: { userId } });
  if (existing) return existing.code;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRaw();
    const conflict = await db.referralCode.findUnique({ where: { code } });
    if (!conflict) {
      await db.referralCode.create({ data: { userId, code } });
      return code;
    }
  }

  throw new Error('Не удалось сгенерировать уникальный реферальный код после 5 попыток');
}
