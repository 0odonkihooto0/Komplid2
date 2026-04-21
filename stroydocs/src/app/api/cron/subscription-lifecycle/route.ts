import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/utils/api';
import { secureCompare } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import {
  processExpiredTrials,
  processExpiredSubscriptions,
  processExpiredGracePeriods,
  processCanceledExpired,
} from '@/lib/subscriptions/lifecycle';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    const secret = process.env.CRON_SECRET;

    if (!secret || !secureCompare(token, secret)) {
      return errorResponse('Unauthorized', 401);
    }

    const [trials, pastDue, grace, canceled] = await Promise.all([
      processExpiredTrials(),
      processExpiredSubscriptions(),
      processExpiredGracePeriods(),
      processCanceledExpired(),
    ]);

    logger.info({ trials, pastDue, grace, canceled }, 'subscription-lifecycle cron выполнен');

    return successResponse({ trials, pastDue, grace, canceled });
  } catch (err) {
    logger.error({ err }, 'subscription-lifecycle cron: ошибка');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
