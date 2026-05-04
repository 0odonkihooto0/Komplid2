/**
 * BullMQ-воркер AI-проверки комплектности ИД (KF-1).
 * Запуск: ts-node -r tsconfig-paths/register src/lib/workers/ai-compliance.worker.ts
 * В продакшне: запускать как отдельный Node.js процесс на том же VPS.
 */
import { Worker } from 'bullmq';
import { runComplianceCheck } from '@/lib/ai/compliance/engine';
import type { AiComplianceJob } from '@/lib/queue';

// BullMQ v5 бандлит свою версию ioredis — передаём plain-объект опций.
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

const worker = new Worker<AiComplianceJob>(
  'ai-compliance',
  async (job) => {
    console.log(`[ai-compliance-worker] Обрабатываю задачу ${job.id}: checkId=${job.data.checkId}`);
    await runComplianceCheck(job.data.checkId);
    console.log(`[ai-compliance-worker] Проверка ${job.data.checkId} завершена`);
  },
  { connection: getRedisOptions(), concurrency: 2 },
);

worker.on('completed', (job) => {
  console.log(`[ai-compliance-worker] ✓ Задача ${job.id} выполнена`);
});

worker.on('failed', (job, err) => {
  console.error(`[ai-compliance-worker] ✗ Задача ${job?.id} провалилась:`, err.message);
});

// Rate-limiting на error events (docs/lessons.md: не спамить в логи)
let lastWorkerError = 0;
worker.on('error', (err) => {
  const now = Date.now();
  if (now - lastWorkerError > 30_000) {
    lastWorkerError = now;
    console.error('[ai-compliance-worker] Ошибка воркера:', err);
  }
});

console.log('[ai-compliance-worker] Запущен, ожидаю задачи из очереди "ai-compliance"...');
