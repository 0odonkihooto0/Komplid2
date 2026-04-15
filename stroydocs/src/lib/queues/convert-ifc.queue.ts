import { Queue } from 'bullmq';

/** Тип задачи конвертации IFC → GLB через IfcOpenShell-сервис */
export interface ConvertIfcJob {
  modelId: string;
  s3Key: string;
  outputS3Key: string;
}

// Парсим REDIS_URL в plain-объект опций для BullMQ.
// BullMQ v5 бандлит свою версию ioredis — передача внешнего IORedis-инстанса
// вызывает TypeScript-конфликт типов между двумя копиями пакета.
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

let convertIfcQueue: Queue<ConvertIfcJob> | null = null;

/** Синглтон очереди конвертации IFC → GLB */
export function getConvertIfcQueue(): Queue<ConvertIfcJob> {
  if (!convertIfcQueue) {
    convertIfcQueue = new Queue<ConvertIfcJob>('convert-ifc', {
      connection: getRedisOptions(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 15_000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });
  }
  return convertIfcQueue;
}
