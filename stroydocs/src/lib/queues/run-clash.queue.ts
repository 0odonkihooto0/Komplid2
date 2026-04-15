import { Queue } from 'bullmq';

/** Тип задачи обнаружения коллизий IFC через IfcOpenShell-сервис */
export interface RunClashJob {
  /** ID BimModel A — сюда записываются результаты */
  modelId: string;
  /** S3-ключ IFC файла модели A */
  s3KeyA: string;
  /** S3-ключ IFC файла модели B (равен s3KeyA при проверке самоколлизий) */
  s3KeyB: string;
  /** Допуск в метрах */
  tolerance: number;
  /** Режим поиска дубликатов геометрии вместо пересечений */
  checkDuplicates: boolean;
  /** Типы IFC-элементов, исключаемые из проверки (например "IfcOpeningElement") */
  excludedTypes: string[];
  /** ID пользователя для уведомления по завершении */
  userId: string;
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

let runClashQueue: Queue<RunClashJob> | null = null;

/** Синглтон очереди обнаружения коллизий IFC */
export function getRunClashQueue(): Queue<RunClashJob> {
  if (!runClashQueue) {
    runClashQueue = new Queue<RunClashJob>('run-clash', {
      connection: getRedisOptions(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 15_000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });
  }
  return runClashQueue;
}
