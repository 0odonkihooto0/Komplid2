import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';
import { YookassaError, YookassaNetworkError, YookassaValidationError } from './errors';

const YOOKASSA_BASE_URL = 'https://api.yookassa.ru/v3';

interface YookassaClientConfig {
  shopId: string;
  secretKey: string;
  timeoutMs?: number;
  maxRetries?: number;
}

interface RequestOptions {
  method: 'GET' | 'POST';
  path: string;
  body?: Record<string, unknown>;
  // Для POST обязателен — передаётся явно или генерируется автоматически
  idempotenceKey?: string;
}

export class YookassaClient {
  private readonly authHeader: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(config: YookassaClientConfig) {
    this.authHeader =
      'Basic ' + Buffer.from(`${config.shopId}:${config.secretKey}`).toString('base64');
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.maxRetries = config.maxRetries ?? 3;
  }

  async request<T>(options: RequestOptions): Promise<T> {
    const { method, path, body } = options;
    // POST всегда требует Idempotence-Key; генерируем, если не передан
    const idempotenceKey =
      options.idempotenceKey ?? (method === 'POST' ? randomUUID() : undefined);

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    };
    if (idempotenceKey) headers['Idempotence-Key'] = idempotenceKey;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(`${YOOKASSA_BASE_URL}${path}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
        clearTimeout(timer);

        const text = await response.text();
        let parsed: unknown;
        try {
          parsed = text ? JSON.parse(text) : {};
        } catch {
          parsed = { raw: text };
        }

        if (!response.ok) {
          // 4xx — ошибка запроса, повтор бессмыслен
          if (response.status >= 400 && response.status < 500) {
            logger.warn({ status: response.status, body: parsed, path }, 'ЮKassa: ошибка валидации');
            throw new YookassaValidationError(response.status, parsed);
          }
          // 5xx — временная проблема на стороне ЮKassa, ретраим
          logger.warn({ attempt, status: response.status, path }, 'ЮKassa: серверная ошибка, повтор');
          lastError = new YookassaError(`ЮKassa вернула ${response.status}`, parsed);
          if (attempt < this.maxRetries) {
            await new Promise((r) => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
          }
          continue;
        }

        logger.debug({ path, attempt }, 'ЮKassa: запрос успешен');
        return parsed as T;
      } catch (error) {
        // YookassaValidationError — бросаем без повтора
        if (error instanceof YookassaValidationError) throw error;

        lastError = error as Error;
        logger.warn({ attempt, error: lastError.message, path }, 'ЮKassa: ошибка запроса');

        if (attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
        }
      }
    }

    throw new YookassaNetworkError(
      `ЮKassa: все ${this.maxRetries} попытки исчерпаны: ${lastError?.message}`,
      lastError,
    );
  }
}

// Singleton — один клиент на процесс
let clientInstance: YookassaClient | null = null;

export function getYookassaClient(): YookassaClient {
  if (!clientInstance) {
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;
    if (!shopId || !secretKey) {
      throw new Error('ЮKassa не настроена: задайте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY');
    }
    clientInstance = new YookassaClient({ shopId, secretKey });
  }
  return clientInstance;
}
