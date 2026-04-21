/**
 * BullMQ-воркер lifecycle подписок.
 * Cron каждый час: обрабатывает истёкшие подписки, dunning-попытки, плановые смены тарифов.
 *
 * Запуск: ts-node -r tsconfig-paths/register src/lib/workers/subscription-lifecycle.worker.ts
 */

import { Worker, Queue } from 'bullmq';
import { buildDatabaseUrl, WORKER_CONNECTION_LIMIT } from '../database-url';

// Устанавливаем лимит соединений до любых импортов @/lib/db
process.env.DATABASE_URL = buildDatabaseUrl(WORKER_CONNECTION_LIMIT);

// eslint-disable-next-line import/first
import {
  processExpiredTrials,
  processExpiredSubscriptions,
  processExpiredGracePeriods,
  processCanceledExpired,
  processDunningAttempts,
  applyPendingPlanChanges,
} from '../subscriptions/lifecycle';

const QUEUE_NAME = 'subscription-lifecycle';
const CRON_PATTERN = '0 * * * *'; // каждый час в 0 минут

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

async function runLifecycle() {
  const [trials, pastDue, grace, canceled, dunning, planChanges] = await Promise.all([
    processExpiredTrials(),
    processExpiredSubscriptions(),
    processExpiredGracePeriods(),
    processCanceledExpired(),
    processDunningAttempts(),
    applyPendingPlanChanges(),
  ]);

  console.log('[subscription-lifecycle]', {
    trials, pastDue, grace, canceled, dunning, planChanges,
    at: new Date().toISOString(),
  });
}

async function registerCronJob() {
  const queue = new Queue(QUEUE_NAME, { connection: getRedisOptions() });
  await queue.upsertJobScheduler(
    'subscription-lifecycle-hourly',
    { pattern: CRON_PATTERN, tz: 'Europe/Moscow' },
    { name: 'run-lifecycle', data: {} },
  );
  await queue.close();
}

const worker = new Worker(
  QUEUE_NAME,
  async () => {
    console.log('[subscription-lifecycle] Запускаю lifecycle...');
    await runLifecycle();
    console.log('[subscription-lifecycle] Lifecycle завершён.');
  },
  { connection: getRedisOptions(), concurrency: 1 },
);

worker.on('completed', (job) => {
  console.log(`[subscription-lifecycle] ✓ Задача ${job.id} выполнена`);
});

worker.on('failed', (job, err) => {
  console.error(`[subscription-lifecycle] ✗ Задача ${job?.id} провалилась:`, err.message);
});

let lastError = 0;
worker.on('error', (err) => {
  const now = Date.now();
  if (now - lastError > 30_000) {
    lastError = now;
    console.error('[subscription-lifecycle] Ошибка воркера:', err.message);
  }
});

registerCronJob()
  .then(() => console.log(`[subscription-lifecycle] Воркер запущен, cron: ${CRON_PATTERN}`))
  .catch(console.error);
