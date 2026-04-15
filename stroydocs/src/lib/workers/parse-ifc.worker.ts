/**
 * BullMQ-воркер парсинга IFC-файлов ТИМ-модели.
 * HTTP-вызов к IfcOpenShell-микросервису (/parse) — парсинг IFC на сервере.
 * Сервис сам скачивает IFC из Timeweb S3, возвращает элементы с PropertySets.
 *
 * Запуск: ts-node -r tsconfig-paths/register src/lib/workers/parse-ifc.worker.ts
 * В продакшне: запускать как отдельный Node.js процесс на том же VPS.
 */
import { Worker } from 'bullmq';
import { PrismaClient, BimModelStatus, Prisma } from '@prisma/client';
import type { ParseBimJob } from '../queues/parse-bim';
import { enqueueNotification } from '../queue';
import { getConvertIfcQueue } from '../queues/convert-ifc.queue';

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

// В воркере создаём отдельный PrismaClient (не синглтон из lib/db),
// чтобы не конфликтовать с Next.js Request Context.
const db = new PrismaClient();

// Размер одного батча при upsert — не переполняем память при тысячах элементов
const BATCH_SIZE = 500;

/** Элемент, возвращаемый IfcOpenShell-сервисом из /parse */
interface IfcServiceElement {
  ifcGuid: string;
  ifcType: string;
  name: string | null;
  description: string | null;
  layer: string | null;
  level: string | null;
  properties: Record<string, unknown> | null;
}

/** Ответ IfcOpenShell-сервиса на POST /parse */
interface IfcParseResponse {
  ifcVersion: string;
  elementCount: number;
  metadata: Record<string, unknown>;
  elements: IfcServiceElement[];
}

const worker = new Worker<ParseBimJob>(
  'parse-bim',
  async (job) => {
    const { modelId, s3Key } = job.data;
    const IFC_SERVICE = process.env.IFC_SERVICE_URL ?? 'http://localhost:8001';

    console.log(`[parse-ifc-worker] Начинаю парсинг IFC для модели ${modelId}`);

    // 1. Обновить статус → PROCESSING
    await db.bimModel.update({
      where: { id: modelId },
      data: { status: BimModelStatus.PROCESSING },
    });

    try {
      // 2. Вызвать IfcOpenShell-сервис: сервис сам скачивает IFC из S3 по s3Key
      console.log(`[parse-ifc-worker] Запрос к IfcOpenShell-сервису: ${IFC_SERVICE}/parse`);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 300_000); // 5 минут на большие модели

      let parseResponse: IfcParseResponse;
      try {
        const response = await fetch(`${IFC_SERVICE}/parse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ s3Key, modelId }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`IfcOpenShell-сервис /parse вернул ${response.status}: ${errText}`);
        }

        parseResponse = (await response.json()) as IfcParseResponse;
      } catch (err) {
        clearTimeout(timer);
        throw err;
      }

      const { ifcVersion, elementCount, metadata, elements } = parseResponse;
      console.log(
        `[parse-ifc-worker] Сервис вернул ${elements.length} элементов, IFC: ${ifcVersion}`
      );

      // 3. Batch upsert элементов в БД (с PropertySets, полностью)
      for (let i = 0; i < elements.length; i += BATCH_SIZE) {
        const batch = elements.slice(i, i + BATCH_SIZE);
        await db.$transaction(
          batch.map((el) =>
            db.bimElement.upsert({
              where: { modelId_ifcGuid: { modelId, ifcGuid: el.ifcGuid } },
              create: {
                modelId,
                ifcGuid: el.ifcGuid,
                ifcType: el.ifcType,
                name: el.name,
                description: el.description,
                layer: el.layer,
                level: el.level,
                properties:
                  el.properties !== null
                    ? (el.properties as Prisma.InputJsonValue)
                    : Prisma.DbNull,
              },
              update: {
                name: el.name,
                properties:
                  el.properties !== null
                    ? (el.properties as Prisma.InputJsonValue)
                    : Prisma.DbNull,
                layer: el.layer,
                level: el.level,
              },
            })
          )
        );
      }

      // 4. Обновить BimModel: статус READY + метаданные от сервиса
      await db.bimModel.update({
        where: { id: modelId },
        data: {
          status: BimModelStatus.READY,
          elementCount,
          ifcVersion,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });

      // 5. Добавить задачу конвертации IFC → GLB в очередь
      const convertQueue = getConvertIfcQueue();
      await convertQueue.add('convert-ifc', {
        modelId,
        s3Key,
        outputS3Key: s3Key.replace('.ifc', '.glb'),
      });

      console.log(
        `[parse-ifc-worker] Модель ${modelId} готова. Элементов: ${elementCount}, IFC: ${ifcVersion}`
      );

      // 6. Уведомить пользователя (некритично — оборачиваем в try-catch)
      try {
        const model = await db.bimModel.findUnique({
          where: { id: modelId },
          select: {
            name: true,
            versions: {
              where: { isCurrent: true },
              select: {
                uploadedBy: { select: { id: true, email: true } },
              },
              take: 1,
            },
          },
        });
        const uploader = model?.versions[0]?.uploadedBy;
        if (model && uploader) {
          await enqueueNotification({
            userId: uploader.id,
            email: uploader.email,
            type: 'bim_model_ready',
            title: `Модель «${model.name}» готова`,
            body: `Парсинг завершён: ${elementCount} элементов, формат ${ifcVersion}.`,
            entityType: 'BimModel',
            entityId: modelId,
            entityName: model.name,
          });
        }
      } catch (notifyErr) {
        console.error('[parse-ifc-worker] Не удалось отправить уведомление:', notifyErr);
      }
    } catch (err) {
      // При ошибке фиксируем ERROR-статус с сообщением
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[parse-ifc-worker] Ошибка парсинга модели ${modelId}:`, message);
      await db.bimModel
        .update({
          where: { id: modelId },
          data: {
            status: BimModelStatus.ERROR,
            metadata: { error: message } as unknown as Prisma.InputJsonValue,
          },
        })
        .catch((dbErr: unknown) => {
          console.error('[parse-ifc-worker] Не удалось обновить статус ERROR:', dbErr);
        });
      throw err; // пробрасываем чтобы BullMQ выполнил retry
    }
  },
  {
    connection: getRedisOptions(),
    // concurrency=1: парсинг тяжёлый на стороне Python-сервиса
    concurrency: 1,
  }
);

worker.on('completed', (job) => {
  console.log(`[parse-ifc-worker] ✓ Задача ${job.id} выполнена`);
});

worker.on('failed', (job, err) => {
  console.error(`[parse-ifc-worker] ✗ Задача ${job?.id} провалилась:`, err.message);
});

let lastWorkerError = 0;
worker.on('error', (err) => {
  const now = Date.now();
  if (now - lastWorkerError > 30_000) {
    lastWorkerError = now;
    console.error('[parse-ifc-worker] Ошибка воркера:', err);
  }
});

console.log('[parse-ifc-worker] Запущен, ожидаю задачи из очереди "parse-bim"...');
