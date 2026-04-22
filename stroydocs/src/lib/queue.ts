import { Queue } from 'bullmq';
import { logger } from './logger';

// Тип задачи уведомления
export interface NotificationJob {
  userId: string;
  email: string;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
}

// Данные для биллинговых email-шаблонов
export interface BillingEmailData {
  userName: string;
  planName: string;
  appUrl: string;
  trialEndDate?: string;
  trialDays?: number;
  graceUntil?: string;
  attemptNumber?: number;
  nextAttemptDate?: string;
  discountPercent?: number;
  promoCode?: string;
  newPlanName?: string;
  changeDate?: string;
  amountRub?: string;
  periodEnd?: string;
  effectiveEndDate?: string;
}

// Тип задачи биллингового email
export interface BillingEmailJob {
  userId: string;
  email: string;
  type: string;
  subject: string;
  templateName: string;
  data: BillingEmailData;
}

// Парсим REDIS_URL в объект опций для BullMQ.
// BullMQ v5 бандлит свою версию ioredis, поэтому нельзя передавать
// externally-created IORedis-инстанс — возникает TypeScript-конфликт типов.
// Передаём plain-объект { host, port, password? }, который BullMQ принимает нативно.
function getRedisOptions() {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const { hostname, port, password, pathname } = new URL(url);
  return {
    host: hostname || 'localhost',
    port: Number(port) || 6379,
    ...(password ? { password: decodeURIComponent(password) } : {}),
    ...(pathname && pathname !== '/' ? { db: Number(pathname.slice(1)) } : {}),
  };
}

let notificationQueue: Queue<NotificationJob> | null = null;

// Синглтон очереди уведомлений
export function getNotificationQueue(): Queue<NotificationJob> {
  if (!notificationQueue) {
    notificationQueue = new Queue<NotificationJob>('notifications', {
      connection: getRedisOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }) as unknown as Queue<NotificationJob>;
  }
  return notificationQueue;
}

// Добавить задачу email-уведомления в очередь
export async function enqueueNotification(job: NotificationJob): Promise<void> {
  try {
    const queue = getNotificationQueue();
    await queue.add('send-email', job);
  } catch (err) {
    // Очередь недоступна — логируем, не ломаем основной поток
    logger.error({ err }, '[queue] Не удалось добавить задачу уведомления');
  }
}

let billingEmailQueue: Queue<BillingEmailJob> | null = null;

// Синглтон очереди биллинговых email
export function getBillingEmailQueue(): Queue<BillingEmailJob> {
  if (!billingEmailQueue) {
    billingEmailQueue = new Queue<BillingEmailJob>('billing-emails', {
      connection: getRedisOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }) as unknown as Queue<BillingEmailJob>;
  }
  return billingEmailQueue;
}

// Добавить биллинговый email в очередь
export async function enqueueBillingEmail(job: BillingEmailJob): Promise<void> {
  try {
    const queue = getBillingEmailQueue();
    await queue.add('send-billing-email', job);
  } catch (err) {
    logger.error({ err }, '[queue] Не удалось добавить биллинговый email');
  }
}
