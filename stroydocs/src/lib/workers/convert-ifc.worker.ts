/**
 * BullMQ-воркер конвертации IFC → GLB через IfcOpenShell-микросервис (/convert).
 * Запускается после успешного парсинга (добавляется в очередь из parse-ifc.worker.ts).
 * Результат (.glb) загружается сервисом в Timeweb S3, glbS3Key сохраняется в BimModel.metadata.
 *
 * Запуск: ts-node -r tsconfig-paths/register src/lib/workers/convert-ifc.worker.ts
 * В продакшне: запускать как отдельный Node.js процесс на том же VPS.
 */
import { Worker } from 'bullmq';
import { PrismaClient, Prisma } from '@prisma/client';
import type { ConvertIfcJob } from '../queues/convert-ifc.queue';

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

// В воркере создаём отдельный PrismaClient (не синглтон из lib/db)
const db = new PrismaClient();

const worker = new Worker<ConvertIfcJob>(
  'convert-ifc',
  async (job) => {
    const { modelId, s3Key, outputS3Key } = job.data;
    const IFC_SERVICE = process.env.IFC_SERVICE_URL ?? 'http://localhost:8001';

    console.log(`[convert-ifc-worker] Начинаю конвертацию IFC → GLB для модели ${modelId}`);
    console.log(`[convert-ifc-worker] ${s3Key} → ${outputS3Key}`);

    // Вызвать IfcOpenShell-сервис: сервис конвертирует IFC → GLB и загружает в S3
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 300_000); // 5 минут на конвертацию

    try {
      const response = await fetch(`${IFC_SERVICE}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Key, outputS3Key }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`IfcOpenShell-сервис /convert вернул ${response.status}: ${errText}`);
      }

      // Записать glbS3Key в BimModel.metadata (merge с существующими метаданными)
      const model = await db.bimModel.findUnique({
        where: { id: modelId },
        select: { metadata: true },
      });
      const existingMeta = (
        model?.metadata !== null && typeof model?.metadata === 'object'
          ? model.metadata
          : {}
      ) as Record<string, unknown>;

      await db.bimModel.update({
        where: { id: modelId },
        data: {
          metadata: { ...existingMeta, glbS3Key: outputS3Key } as Prisma.InputJsonValue,
        },
      });

      console.log(
        `[convert-ifc-worker] Конвертация завершена. GLB: ${outputS3Key}`
      );
    } catch (err) {
      clearTimeout(timer);
      // Конвертация некритична для работы вьюера (можно показывать IFC напрямую),
      // поэтому логируем ошибку, но не обновляем статус BimModel → ERROR
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[convert-ifc-worker] Ошибка конвертации модели ${modelId}:`, message);
      throw err; // пробрасываем чтобы BullMQ выполнил retry
    }
  },
  {
    connection: getRedisOptions(),
    // concurrency=2: конвертация менее ресурсоёмка чем парсинг
    concurrency: 2,
  }
);

worker.on('completed', (job) => {
  console.log(`[convert-ifc-worker] ✓ Задача ${job.id} выполнена`);
});

worker.on('failed', (job, err) => {
  console.error(`[convert-ifc-worker] ✗ Задача ${job?.id} провалилась:`, err.message);
});

let lastWorkerError = 0;
worker.on('error', (err) => {
  const now = Date.now();
  if (now - lastWorkerError > 30_000) {
    lastWorkerError = now;
    console.error('[convert-ifc-worker] Ошибка воркера:', err);
  }
});

console.log('[convert-ifc-worker] Запущен, ожидаю задачи из очереди "convert-ifc"...');
