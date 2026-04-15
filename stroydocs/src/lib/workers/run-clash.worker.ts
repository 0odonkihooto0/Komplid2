/**
 * BullMQ-воркер обнаружения коллизий IFC через IfcOpenShell-сервис (/clash).
 * Результат сохраняется в BimModel.metadata.clashResults.
 *
 * Запуск: ts-node -r tsconfig-paths/register src/lib/workers/run-clash.worker.ts
 * В продакшне: запускать как отдельный Node.js процесс на том же VPS.
 */
import { Worker } from 'bullmq';
import { PrismaClient, Prisma } from '@prisma/client';
import type { RunClashJob } from '../queues/run-clash.queue';
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

// В воркере создаём отдельный PrismaClient (не синглтон из lib/db),
// чтобы не конфликтовать с Next.js Request Context.
const db = new PrismaClient();

/** Элемент результата коллизии от IfcOpenShell-сервиса */
interface ClashServiceItem {
  elementAGuid: string;
  elementAName: string | null;
  elementBGuid: string;
  elementBName: string | null;
  clashPoint: number[] | null;
  type: string;
}

/** Нормализованный результат коллизии, сохраняемый в metadata */
interface ClashResult {
  guidA: string;
  nameA: string | null;
  guidB: string;
  nameB: string | null;
  clashPoint: number[] | null;
  type: string;
}

const worker = new Worker<RunClashJob>(
  'run-clash',
  async (job) => {
    const { modelId, s3KeyA, s3KeyB, tolerance, checkDuplicates, excludedTypes, userId } =
      job.data;
    const IFC_SERVICE = process.env.IFC_SERVICE_URL ?? 'http://localhost:8001';

    console.log(
      `[run-clash-worker] Начинаю обнаружение коллизий для модели ${modelId}, ` +
        `A=${s3KeyA} B=${s3KeyB}, tolerance=${tolerance}, duplicates=${checkDuplicates}`
    );

    // 1. Загрузить имя модели для уведомления
    const model = await db.bimModel.findUnique({
      where: { id: modelId },
      select: { name: true, metadata: true },
    });

    try {
      // 2. Вызвать IfcOpenShell-сервис с увеличенным таймаутом (большие модели)
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 600_000); // 10 минут

      let serviceItems: ClashServiceItem[];
      try {
        const response = await fetch(`${IFC_SERVICE}/clash`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            s3KeyA,
            s3KeyB,
            tolerance,
            checkDuplicates,
            excludedTypes,
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`IfcOpenShell-сервис /clash вернул ${response.status}: ${errText}`);
        }

        serviceItems = (await response.json()) as ClashServiceItem[];
      } catch (err) {
        clearTimeout(timer);
        throw err;
      }

      // 3. Нормализовать ответ сервиса → внутренний формат
      const results: ClashResult[] = serviceItems.map((item) => ({
        guidA: item.elementAGuid,
        nameA: item.elementAName,
        guidB: item.elementBGuid,
        nameB: item.elementBName,
        clashPoint: item.clashPoint,
        type: item.type,
      }));

      const count = results.length;
      console.log(`[run-clash-worker] Найдено коллизий: ${count}`);

      // 4. Смержить результаты в BimModel.metadata
      const existingMeta = (
        model?.metadata !== null && typeof model?.metadata === 'object'
          ? model.metadata
          : {}
      ) as Record<string, unknown>;

      await db.bimModel.update({
        where: { id: modelId },
        data: {
          metadata: {
            ...existingMeta,
            clashStatus: 'DONE',
            clashResults: {
              count,
              completedAt: new Date().toISOString(),
              results,
            },
          } as unknown as Prisma.InputJsonValue,
        },
      });

      console.log(`[run-clash-worker] Результаты сохранены в metadata модели ${modelId}`);

      // 5. Уведомить пользователя (некритично — оборачиваем в try-catch)
      try {
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true },
        });
        if (user && model) {
          await enqueueNotification({
            userId: user.id,
            email: user.email,
            type: 'bim_clash_done',
            title: `Коллизии в «${model.name}»: найдено ${count}`,
            body:
              count > 0
                ? `Обнаружено ${count} коллизий. Откройте модель для просмотра.`
                : 'Коллизий не найдено.',
            entityType: 'BimModel',
            entityId: modelId,
            entityName: model.name,
          });
        }
      } catch (notifyErr) {
        console.error('[run-clash-worker] Не удалось отправить уведомление:', notifyErr);
      }
    } catch (err) {
      // При ошибке фиксируем ERROR-статус в metadata
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[run-clash-worker] Ошибка обнаружения коллизий для модели ${modelId}:`, message);

      const existingMeta = (
        model?.metadata !== null && typeof model?.metadata === 'object'
          ? model.metadata
          : {}
      ) as Record<string, unknown>;

      await db.bimModel
        .update({
          where: { id: modelId },
          data: {
            metadata: {
              ...existingMeta,
              clashStatus: 'ERROR',
              clashError: message,
            } as unknown as Prisma.InputJsonValue,
          },
        })
        .catch((dbErr: unknown) => {
          console.error('[run-clash-worker] Не удалось обновить статус ERROR:', dbErr);
        });

      throw err; // пробрасываем чтобы BullMQ выполнил retry
    }
  },
  {
    connection: getRedisOptions(),
    // concurrency=1: /clash тяжёлый на стороне Python-сервиса
    concurrency: 1,
  }
);

worker.on('completed', (job) => {
  console.log(`[run-clash-worker] ✓ Задача ${job.id} выполнена`);
});

worker.on('failed', (job, err) => {
  console.error(`[run-clash-worker] ✗ Задача ${job?.id} провалилась:`, err.message);
});

let lastWorkerError = 0;
worker.on('error', (err) => {
  const now = Date.now();
  if (now - lastWorkerError > 30_000) {
    lastWorkerError = now;
    console.error('[run-clash-worker] Ошибка воркера:', err);
  }
});

console.log('[run-clash-worker] Запущен, ожидаю задачи из очереди "run-clash"...');
