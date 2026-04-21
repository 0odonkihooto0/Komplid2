import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { secureCompare } from '@/lib/auth-utils';
import { scanRecentReferrals } from '@/lib/referrals/anti-fraud';

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!secret || !token || !secureCompare(token, secret)) {
    return new NextResponse(null, { status: 401 });
  }

  try {
    const result = await scanRecentReferrals();
    logger.info(result, 'Referral fraud scan completed');
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, 'Referral fraud scan failed');
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
