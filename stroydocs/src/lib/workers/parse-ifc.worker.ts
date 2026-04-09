/**
 * BullMQ-воркер парсинга IFC-файлов ТИМ-модели.
 * Скачивает IFC из Timeweb S3, парсит через web-ifc (WASM),
 * сохраняет BimElement[] в БД и переводит BimModel в статус READY.
 *
 * Запуск: ts-node -r tsconfig-paths/register src/lib/workers/parse-ifc.worker.ts
 * В продакшне: запускать как отдельный Node.js процесс на том же VPS.
 */
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { Worker } from 'bullmq';
import { PrismaClient, BimModelStatus } from '@prisma/client';
import * as WebIFC from 'web-ifc';
import { downloadFile } from '../s3-utils';
import type { ParseBimJob } from '../queues/parse-bim';

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

// Размер одного батча при createMany — не переполняем память при тысячах элементов
const BATCH_SIZE = 500;

/**
 * Извлечь строковое значение из IFC-поля (GlobalId, Name, Description и т.д.).
 * web-ifc возвращает значения как объекты { type, value } или null.
 */
function extractIfcString(field: unknown): string | null {
  if (!field || typeof field !== 'object') return null;
  const f = field as Record<string, unknown>;
  if (typeof f.value === 'string') return f.value;
  return null;
}

/**
 * Парсинг одного IFC-файла:
 * — открываем через web-ifc IfcAPI
 * — перебираем все линии, отбираем сущности с GlobalId
 * — батч-вставляем в bim_elements
 */
async function parseIfcFile(
  modelId: string,
  tmpFilePath: string
): Promise<{ elementCount: number; ifcVersion: string }> {
  const ifcApi = new WebIFC.IfcAPI();

  // Путь к WASM — web-ifc-node.wasm лежит рядом с пакетом.
  // absolute=true чтобы не зависеть от cwd воркера.
  ifcApi.SetWasmPath(
    path.join(process.cwd(), 'node_modules', 'web-ifc') + path.sep,
    true
  );
  await ifcApi.Init();

  const fileData = await fs.readFile(tmpFilePath);
  const modelID = ifcApi.OpenModel(new Uint8Array(fileData.buffer));

  const ifcVersion = ifcApi.GetModelSchema(modelID) ?? 'IFC4';

  // Получаем все expressID в модели
  const allLines = ifcApi.GetAllLines(modelID);
  const elements: Array<{
    modelId: string;
    ifcGuid: string;
    ifcType: string;
    name: string | null;
    description: string | null;
    layer: string | null;
    level: string | null;
  }> = [];

  // Array.from() обязателен — Vector<number> не является стандартным Array
  // (см. lessons.md: "Array.entries() в for...of без Array.from()")
  for (const lineID of Array.from(allLines)) {
    let line: Record<string, unknown> | null = null;
    try {
      line = ifcApi.GetLine(modelID, lineID, false) as Record<string, unknown>;
    } catch {
      // Некоторые служебные линии не поддаются GetLine — пропускаем
      continue;
    }
    if (!line) continue;

    // Отбираем только именованные сущности (IfcProduct и его наследники),
    // у которых есть GlobalId
    const globalId = extractIfcString(line.GlobalId);
    if (!globalId) continue;

    // ifcType — имя класса IFC (IfcWall, IfcSlab, IfcColumn и т.д.)
    // web-ifc хранит числовой type ID; преобразуем через TypeNames если доступно
    const typeId = typeof line.type === 'number' ? line.type : null;
    const ifcType = typeId != null
      ? (WebIFC as unknown as Record<number, string>)[typeId] ?? `IFC_TYPE_${typeId}`
      : 'UNKNOWN';

    elements.push({
      modelId,
      ifcGuid: globalId,
      ifcType,
      name: extractIfcString(line.Name),
      description: extractIfcString(line.Description),
      layer: extractIfcString((line as Record<string, unknown>).ObjectPlacement) ?? null,
      level: extractIfcString((line as Record<string, unknown>).ContainedInStructure) ?? null,
      // properties опущено — null-значение для Prisma JSON nullable требует Prisma.DbNull
    });
  }

  ifcApi.CloseModel(modelID);

  // Батч-вставка в БД с skipDuplicates (повторный парсинг безопасен)
  let inserted = 0;
  for (let i = 0; i < elements.length; i += BATCH_SIZE) {
    const batch = elements.slice(i, i + BATCH_SIZE);
    const result = await db.bimElement.createMany({
      data: batch,
      skipDuplicates: true,
    });
    inserted += result.count;
  }

  return { elementCount: inserted, ifcVersion };
}

const worker = new Worker<ParseBimJob>(
  'parse-bim',
  async (job) => {
    const { modelId, s3Key } = job.data;
    console.log(`[parse-ifc-worker] Начинаю парсинг IFC для модели ${modelId}`);

    const tmpFilePath = path.join(os.tmpdir(), `bim-${modelId}.ifc`);

    try {
      // 1. Скачать IFC из S3 во временный файл
      console.log(`[parse-ifc-worker] Скачиваю из S3: ${s3Key}`);
      const fileBuffer = await downloadFile(s3Key);
      await fs.writeFile(tmpFilePath, fileBuffer);

      // 2. Парсинг через web-ifc
      console.log(`[parse-ifc-worker] Парсинг IFC (${fileBuffer.length} байт)...`);
      const { elementCount, ifcVersion } = await parseIfcFile(modelId, tmpFilePath);

      // 3. Обновить BimModel: статус READY, количество элементов, версия IFC
      await db.bimModel.update({
        where: { id: modelId },
        data: {
          status: BimModelStatus.READY,
          elementCount,
          ifcVersion,
        },
      });

      console.log(
        `[parse-ifc-worker] Модель ${modelId} готова. Элементов: ${elementCount}, IFC: ${ifcVersion}`
      );
    } catch (err) {
      // 4. При ошибке фиксируем ERROR-статус с сообщением
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[parse-ifc-worker] Ошибка парсинга модели ${modelId}:`, message);
      await db.bimModel.update({
        where: { id: modelId },
        data: {
          status: BimModelStatus.ERROR,
          metadata: { error: message },
        },
      }).catch((dbErr: unknown) => {
        console.error('[parse-ifc-worker] Не удалось обновить статус ERROR:', dbErr);
      });
      throw err; // пробрасываем чтобы BullMQ выполнил retry
    } finally {
      // 5. Удалить временный файл в любом случае
      await fs.unlink(tmpFilePath).catch(() => undefined);
    }
  },
  {
    connection: getRedisOptions(),
    // concurrency=1: WASM-парсер тяжёлый, большие IFC-файлы (100-500 МБ) требуют много RAM
    concurrency: 1,
  }
);

worker.on('completed', (job) => {
  console.log(`[parse-ifc-worker] ✓ Задача ${job.id} выполнена`);
});

worker.on('failed', (job, err) => {
  console.error(`[parse-ifc-worker] ✗ Задача ${job?.id} провалилась:`, err.message);
});

worker.on('error', (err) => {
  console.error('[parse-ifc-worker] Ошибка воркера:', err);
});

console.log('[parse-ifc-worker] Запущен, ожидаю задачи из очереди "parse-bim"...');
