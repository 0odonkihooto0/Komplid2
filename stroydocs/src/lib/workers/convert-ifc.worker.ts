/**
 * BullMQ-воркер конвертации IFC → GLB через IfcOpenShell-микросервис (/convert).
 * Запускается после успешного парсинга (добавляется в очередь из parse-ifc.worker.ts).
 * Результат (.glb) загружается сервисом в Timeweb S3, glbS3Key сохраняется в BimModel.metadata.
 *
 * Жизненный цикл статусов BimModel:
 *   PROCESSING  — идёт парсинг IFC (parse-ifc worker)
 *   CONVERTING  — парсинг завершён, идёт конвертация IFC → GLB (этот воркер)
 *   READY       — GLB успешно загружен в S3, metadata.glbS3Key установлен
 *   ERROR       — конвертация провалилась (финальная попытка), metadata.convertError установлен
 *
 * Запуск: ts-node -r tsconfig-paths/register src/lib/workers/convert-ifc.worker.ts
 * В продакшне: запускается из scripts/start.sh как отдельный Node.js процесс.
 */
import { Worker } from 'bullmq';
import { PrismaClient, BimModelStatus, Prisma } from '@prisma/client';
import type { ConvertIfcJob } from '../queues/convert-ifc.queue';
import { enqueueNotification } from '../queue';

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

/** Таймаут на всю операцию конвертации (HTTP-запрос к ifc-service).
 * IfcConvert внутри сервиса имеет свой таймаут 300с (subprocess.run) —
 * оставляем буфер 3 мин на S3-upload и сетевые задержки. */
const CONVERT_TIMEOUT_MS = 480_000; // 8 минут

/** Извлечь метаданные BimModel как plain object (null/non-object → {}) */
function getMeta(metadata: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (metadata !== null && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

/** Отправить пользователю-загрузчику уведомление об ошибке конвертации (best-effort) */
async function notifyConvertFailed(modelId: string, errorMessage: string): Promise<void> {
  try {
    const model = await db.bimModel.findUnique({
      where: { id: modelId },
      select: {
        name: true,
        versions: {
          where: { isCurrent: true },
          select: { uploadedBy: { select: { id: true, email: true } } },
          take: 1,
        },
      },
    });
    const uploader = model?.versions[0]?.uploadedBy;
    if (model && uploader) {
      await enqueueNotification({
        userId: uploader.id,
        email: uploader.email,
        type: 'bim_model_convert_failed',
        title: `Не удалось подготовить 3D модели «${model.name}»`,
        body: `Конвертация IFC → GLB завершилась ошибкой: ${errorMessage.slice(0, 200)}`,
        entityType: 'BimModel',
        entityId: modelId,
        entityName: model.name,
      });
    }
  } catch (notifyErr) {
    console.error('[convert-ifc-worker] Не удалось отправить уведомление об ошибке:', notifyErr);
  }
}

/** Отправить пользователю уведомление об успехе — 3D готова (best-effort) */
async function notifyConvertReady(modelId: string): Promise<void> {
  try {
    const model = await db.bimModel.findUnique({
      where: { id: modelId },
      select: {
        name: true,
        versions: {
          where: { isCurrent: true },
          select: { uploadedBy: { select: { id: true, email: true } } },
          take: 1,
        },
      },
    });
    const uploader = model?.versions[0]?.uploadedBy;
    if (model && uploader) {
      await enqueueNotification({
        userId: uploader.id,
        email: uploader.email,
        type: 'bim_model_3d_ready',
        title: `3D модели «${model.name}» готова`,
        body: `Конвертация IFC → GLB успешно завершена. Можно открывать 3D-вьюер.`,
        entityType: 'BimModel',
        entityId: modelId,
        entityName: model.name,
      });
    }
  } catch (notifyErr) {
    console.error('[convert-ifc-worker] Не удалось отправить уведомление об успехе:', notifyErr);
  }
}

const worker = new Worker<ConvertIfcJob>(
  'convert-ifc',
  async (job) => {
    const { modelId, s3Key, outputS3Key } = job.data;
    const IFC_SERVICE = process.env.IFC_SERVICE_URL ?? 'http://localhost:8001';

    console.log(`[convert-ifc-worker] Начинаю конвертацию IFC → GLB для модели ${modelId}`);
    console.log(`[convert-ifc-worker] ${s3Key} → ${outputS3Key} (ifc-service: ${IFC_SERVICE})`);

    // 1. Идемпотентно ставим статус CONVERTING (parse-воркер уже должен был это сделать,
    //    но при reconvert модель могла быть в ERROR или READY)
    await db.bimModel.update({
      where: { id: modelId },
      data: { status: BimModelStatus.CONVERTING },
    }).catch((err: unknown) => {
      console.error('[convert-ifc-worker] Не удалось обновить статус CONVERTING:', err);
    });

    // 2. Вызвать IfcOpenShell-сервис: сервис конвертирует IFC → GLB и загружает в S3
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONVERT_TIMEOUT_MS);

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
        throw new Error(`ifc-service /convert вернул ${response.status}: ${errText.slice(0, 300)}`);
      }

      // 3. Merge glbS3Key в metadata + перевод статуса в READY
      const model = await db.bimModel.findUnique({
        where: { id: modelId },
        select: { metadata: true },
      });
      const existingMeta = getMeta(model?.metadata);
      // Удаляем convertError если он был (повторная конвертация после ошибки)
      delete existingMeta.convertError;

      await db.bimModel.update({
        where: { id: modelId },
        data: {
          status: BimModelStatus.READY,
          metadata: { ...existingMeta, glbS3Key: outputS3Key } as unknown as Prisma.InputJsonValue,
        },
      });

      console.log(`[convert-ifc-worker] ✓ Модель ${modelId} готова. GLB: ${outputS3Key}`);

      // 4. Уведомить пользователя (некритично — ошибки глушим в функции)
      await notifyConvertReady(modelId);
    } catch (err) {
      clearTimeout(timer);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const message = isAbort
        ? `Таймаут конвертации (${CONVERT_TIMEOUT_MS / 1000}с)`
        : err instanceof Error ? err.message : String(err);
      console.error(`[convert-ifc-worker] Ошибка конвертации модели ${modelId}:`, message);

      // Только на финальной попытке фиксируем ERROR-статус и уведомляем.
      // Промежуточные падения → BullMQ ретраит (attempts=2 в конфиге очереди).
      const totalAttempts = job.opts.attempts ?? 2;
      const isFinalAttempt = job.attemptsMade + 1 >= totalAttempts;

      if (isFinalAttempt) {
        const model = await db.bimModel.findUnique({
          where: { id: modelId },
          select: { metadata: true },
        });
        const existingMeta = getMeta(model?.metadata);

        await db.bimModel.update({
          where: { id: modelId },
          data: {
            status: BimModelStatus.ERROR,
            metadata: {
              ...existingMeta,
              convertError: message,
            } as unknown as Prisma.InputJsonValue,
          },
        }).catch((dbErr: unknown) => {
          console.error('[convert-ifc-worker] Не удалось записать ERROR-статус:', dbErr);
        });

        await notifyConvertFailed(modelId, message);
      }

      throw err; // пробрасываем чтобы BullMQ выполнил retry (или зафиксировал failure)
    }
  },
  {
    connection: getRedisOptions(),
    // concurrency=2: конвертация менее ресурсоёмка чем парсинг (основная нагрузка на ifc-service)
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
