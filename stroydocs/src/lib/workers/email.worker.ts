/**
 * BullMQ-воркер биллинговых email.
 * Запуск: ts-node -r tsconfig-paths/register src/lib/workers/email.worker.ts
 * В продакшне: запускать как отдельный Node.js процесс на том же VPS.
 */
import { Worker } from 'bullmq';
import { sendBillingEmail } from '../billing-email';
import type { BillingEmailJob } from '../queue';

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

const worker = new Worker<BillingEmailJob>(
  'billing-emails',
  async (job) => {
    console.log(`[email-worker] Обрабатываю задачу ${job.id}: ${job.data.type} → ${job.data.email}`);
    await sendBillingEmail(job.data);
    console.log(`[email-worker] Email отправлен: ${job.data.email} (${job.data.type})`);
  },
  { connection: getRedisOptions(), concurrency: 5 }
);

worker.on('completed', (job) => {
  console.log(`[email-worker] ✓ Задача ${job.id} выполнена`);
});

worker.on('failed', (job, err) => {
  console.error(`[email-worker] ✗ Задача ${job?.id} провалилась:`, err.message);
});

let lastWorkerError = 0;
worker.on('error', (err) => {
  const now = Date.now();
  if (now - lastWorkerError > 30_000) {
    lastWorkerError = now;
    console.error('[email-worker] Ошибка воркера:', err);
  }
});

console.log('[email-worker] Запущен, ожидаю задачи из очереди "billing-emails"...');
