/**
 * BullMQ-воркер уведомлений.
 * Запуск: ts-node -r tsconfig-paths/register src/lib/workers/notification.worker.ts
 * В продакшне: запускать как отдельный Node.js процесс на том же VPS.
 */
import { Worker } from 'bullmq';
import { sendNotificationEmail } from '../email';
import { sendPushForNotificationJob } from '../push/notification-adapter';
import type { NotificationJob } from '../queue';

// Парсим REDIS_URL в plain-объект опций для BullMQ.
// BullMQ v5 бандлит свою версию ioredis — передача внешнего IORedis-инстанса
// вызывает TypeScript-конфликт типов между двумя копиями пакета.
function getRedisOptions() {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const { hostname, port, password, pathname } = new URL(url);
  return {
    host: hostname || 'localhost',
    port: Number(port) || 6379,
    maxRetriesPerRequest: null as null,
    ...(password ? { password: decodeURIComponent(password) } : {}),
    ...(pathname && pathname !== '/' ? { db: Number(pathname.slice(1)) } : {}),
  };
}

const worker = new Worker<NotificationJob>(
  'notifications',
  async (job) => {
    console.log(`[notification-worker] Обрабатываю задачу ${job.id}: ${job.data.type}`);
    await sendNotificationEmail(job.data);
    console.log(`[notification-worker] Email отправлен: ${job.data.email}`);
    // Push параллельно email — fire-and-forget, не блокируем job
    sendPushForNotificationJob(job.data).catch(() => {});
  },
  { connection: getRedisOptions(), concurrency: 5 }
);

worker.on('completed', (job) => {
  console.log(`[notification-worker] ✓ Задача ${job.id} выполнена`);
});

worker.on('failed', (job, err) => {
  console.error(`[notification-worker] ✗ Задача ${job?.id} провалилась:`, err.message);
});

let lastWorkerError = 0;
worker.on('error', (err) => {
  const now = Date.now();
  if (now - lastWorkerError > 30_000) {
    lastWorkerError = now;
    console.error('[notification-worker] Ошибка воркера:', err);
  }
});

console.log('[notification-worker] Запущен, ожидаю задачи из очереди "notifications"...');
