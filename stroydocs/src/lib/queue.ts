import { Queue } from 'bullmq';

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
    console.error('[queue] Не удалось добавить задачу уведомления:', err);
  }
}
