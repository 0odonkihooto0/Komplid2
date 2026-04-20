import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

function getWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:noreply@stroydocs.ru';

  if (!publicKey || !privateKey) return null;

  // Ленивая инициализация — вызывается только при наличии VAPID ключей
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const webpush = require('web-push') as typeof import('web-push');
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return webpush;
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; removed: number }> {
  const webpush = getWebPush();
  if (!webpush) return { sent: 0, removed: 0 };

  const subscriptions = await db.pushSubscription.findMany({
    where: { userId },
  });

  let sent = 0;
  let removed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dhKey, auth: sub.authKey } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 24, urgency: 'normal' }
      );

      await db.pushSubscription.update({
        where: { id: sub.id },
        data: { lastUsedAt: new Date() },
      });

      sent++;
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 410 || status === 404) {
        await db.pushSubscription.delete({ where: { id: sub.id } });
        removed++;
        logger.info({ userId, subId: sub.id }, 'Push subscription expired, removed');
      } else {
        logger.error({ err: error, userId, subId: sub.id }, 'Push send failed');
      }
    }
  }

  return { sent, removed };
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<void> {
  await Promise.allSettled(userIds.map((id) => sendPushToUser(id, payload)));
}
