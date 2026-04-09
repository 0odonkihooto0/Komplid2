import { Queue } from 'bullmq';

/** Тип задачи парсинга IFC-файла ТИМ-модели */
export interface ParseBimJob {
  modelId: string;
  s3Key: string;
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

let parseBimQueue: Queue<ParseBimJob> | null = null;

/** Синглтон очереди парсинга IFC */
export function getParseBimQueue(): Queue<ParseBimJob> {
  if (!parseBimQueue) {
    parseBimQueue = new Queue<ParseBimJob>('parse-bim', {
      connection: getRedisOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });
  }
  return parseBimQueue;
}
