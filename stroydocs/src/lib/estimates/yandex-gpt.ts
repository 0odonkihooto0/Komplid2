import { logger } from '@/lib/logger';
import type { ParsedEstimateItem, EstimateItemType } from './types';

const YANDEX_GPT_ENDPOINT =
  'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

/** Минимальная пауза между запросами (мс) — rate limiting */
const MIN_REQUEST_INTERVAL = 1000;
let lastRequestTime = 0;

/**
 * Ошибка safety-фильтра Yandex GPT.
 * Выбрасывается когда GPT отказывается обрабатывать запрос.
 * В этом случае автоматически активируется Gemini fallback.
 */
export class YandexSafetyFilterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YandexSafetyFilterError';
  }
}

/**
 * Системный промпт для извлечения позиций сметы.
 * Различает работы (глаголы: Монтаж, Укладка) и материалы (существительные: Бетон, Труба).
 * Привязывает материалы к родительской работе через parentIndex.
 */
const SYSTEM_PROMPT = `Ты — эксперт по строительным сметам России. Твоя задача — извлечь из текста строительной сметы список позиций.

Верни JSON-массив объектов. Каждый объект должен содержать поля:
- name (string) — наименование работы или материала
- unit (string | null) — единица измерения (м, м2, м3, шт, кг, т, л, компл, п.м и т.д.)
- volume (number | null) — объём или количество. Если ноль — пропусти позицию
- price (number | null) — цена за единицу
- total (number | null) — итоговая сумма
- itemType ("WORK" | "MATERIAL") — тип позиции:
  * WORK — это работа: содержит глагол-действие (Монтаж, Укладка, Устройство, Прокладка, Установка, Демонтаж, Бетонирование, Армирование, Гидроизоляция и т.п.)
  * MATERIAL — это материал: существительное (Бетон, Арматура, Труба, Кирпич, Раствор, Плита, Песок, Щебень, Кабель и т.п.)
- parentIndex (number | null) — индекс (0-based) родительской WORK-позиции в этом массиве, к которой относится данный материал. Для WORK-позиций всегда null.

Правила:
1. Пропускай позиции с нулевым объёмом (volume = 0 или null при явно пустом поле)
2. Если значение неизвестно — ставь null, не придумывай
3. Материалы располагаются обычно после работы, к которой относятся — привязывай через parentIndex
4. Верни ТОЛЬКО валидный JSON-массив без комментариев, без markdown, без пояснений`;

/** Отправка текста в YandexGPT и получение структурированных позиций */
export async function parseWithYandexGpt(
  textChunks: string[]
): Promise<ParsedEstimateItem[]> {
  const allItems: ParsedEstimateItem[] = [];

  for (let i = 0; i < textChunks.length; i++) {
    const chunk = textChunks[i];
    logger.info({ chunkIndex: i, chunkLength: chunk.length }, 'Отправка чанка в YandexGPT');

    const items = await sendGptRequest(chunk);
    // Нумеруем позиции с учётом предыдущих чанков
    for (const item of items) {
      allItems.push({
        ...item,
        sortOrder: allItems.length + 1,
      });
    }
  }

  logger.info({ totalItems: allItems.length }, 'YandexGPT парсинг завершён');
  return allItems;
}

/**
 * Отправка одного чанка (2D строки) в YandexGPT.
 * Используется в новом конвейере process-chunk.
 * Возвращает распознанные позиции с типами и привязкой материалов.
 */
export async function parseChunkWithYandexGpt(
  headers: string[],
  rows: string[][]
): Promise<ParsedEstimateItem[]> {
  // Формируем текстовое представление чанка
  const headerLine = headers.join(' | ');
  const dataLines = rows.map((row, i) =>
    `Строка ${i + 1}: ${row.map((cell, j) => `${headers[j] || `Кол${j + 1}`}: ${cell}`).join(' | ')}`
  );
  const text = `Заголовки: ${headerLine}\n\n${dataLines.join('\n')}`;

  return sendGptRequest(text);
}

/** Один запрос к YandexGPT с retry и rate limiting */
async function sendGptRequest(text: string): Promise<ParsedEstimateItem[]> {
  // Поддерживаем оба имени: YANDEX_CLOUD_API_KEY (env-шаблон) и YANDEX_API_KEY (консоль Yandex Cloud)
  const apiKey = process.env.YANDEX_CLOUD_API_KEY ?? process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;

  if (!apiKey || !folderId) {
    throw new Error('YANDEX_API_KEY (или YANDEX_CLOUD_API_KEY) и YANDEX_FOLDER_ID должны быть заданы в .env');
  }

  // Rate limiting
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await sleep(MIN_REQUEST_INTERVAL - elapsed);
  }

  const body = {
    modelUri: `gpt://${folderId}/yandexgpt/latest`,
    completionOptions: {
      stream: false,
      temperature: 0.1,
      maxTokens: '8000',
    },
    messages: [
      { role: 'system', text: SYSTEM_PROMPT },
      { role: 'user', text: `Текст сметы:\n${text}` },
    ],
  };

  let lastError: Error | null = null;

  // Retry: 3 попытки с экспоненциальным backoff
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      lastRequestTime = Date.now();

      const response = await fetch(YANDEX_GPT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Api-Key ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (response.status === 429 || response.status >= 500) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        logger.warn(
          { status: response.status, attempt, delayMs: delay },
          'YandexGPT rate limit / server error, retrying'
        );
        await sleep(delay);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`YandexGPT API error ${response.status}: ${errorText}`);
      }

      const data = await response.json() as YandexGptResponse;
      const resultText = data.result?.alternatives?.[0]?.message?.text;

      if (!resultText) {
        logger.warn({ data }, 'YandexGPT вернул пустой ответ');
        return [];
      }

      // Проверяем safety-фильтр до парсинга JSON
      detectSafetyFilter(resultText);

      logger.debug({ responseLength: resultText.length }, 'YandexGPT ответ получен');
      return parseGptResponse(resultText);
    } catch (error) {
      // Safety filter — не ретраим, сразу пробрасываем для Gemini fallback
      if (error instanceof YandexSafetyFilterError) throw error;

      lastError = error as Error;
      logger.error({ error, attempt }, 'Ошибка запроса к YandexGPT');

      // При SyntaxError (truncated JSON) — ретраим с задержкой
      if (attempt < 2) {
        await sleep(1000 * (attempt + 1));
      }
    }
  }

  throw lastError || new Error('YandexGPT: все попытки исчерпаны');
}

/**
 * Проверяет, сработал ли safety-фильтр Yandex GPT.
 * GPT может отказать в обработке строительных текстов если видит "взрывчатку", "химию" и т.п.
 */
function detectSafetyFilter(text: string): void {
  const safetyPhrases = [
    'не могу обсуждать',
    'не могу помочь',
    'не могу обработать',
    'не могу выполнить',
    'не могу отвечать',
    'не могу рассматривать',
    'не предназначен для',
    'противоречит правилам',
    'нарушает правила',
    'я не в состоянии',
  ];

  const lower = text.toLowerCase();
  if (safetyPhrases.some((phrase) => lower.includes(phrase))) {
    logger.warn({ response: text.substring(0, 200) }, 'YandexGPT safety filter triggered');
    throw new YandexSafetyFilterError(
      'YandexGPT отклонил запрос (safety filter). Переключение на резервный AI.'
    );
  }
}

/** Парсинг JSON из ответа GPT (обработка markdown-обёрток) */
function parseGptResponse(text: string): ParsedEstimateItem[] {
  // Убираем markdown code blocks
  let cleaned = text.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Ищем JSON-массив
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!arrayMatch) {
    logger.warn({ text: cleaned.substring(0, 200) }, 'Не найден JSON-массив в ответе GPT');
    return [];
  }

  try {
    const parsed = JSON.parse(arrayMatch[0]) as GptItem[];
    return parsed
      .filter((item) => item.name && item.name.trim().length > 0)
      .filter((item) => {
        // Игнорируем позиции с нулевым объёмом
        if (item.volume === 0) return false;
        return true;
      })
      .map((item, index) => ({
        sortOrder: index + 1,
        rawName: String(item.name).trim(),
        rawUnit: item.unit ? String(item.unit).trim() : null,
        volume: typeof item.volume === 'number' ? item.volume : null,
        price: typeof item.price === 'number' ? item.price : null,
        total: typeof item.total === 'number' ? item.total : null,
        itemType: normalizeItemType(item.itemType),
        parentIndex: typeof item.parentIndex === 'number' ? item.parentIndex : undefined,
      }));
  } catch (error) {
    logger.error({ error, text: cleaned.substring(0, 500) }, 'Ошибка парсинга JSON из GPT');
    return [];
  }
}

/** Нормализация типа позиции из ответа GPT */
function normalizeItemType(value: unknown): EstimateItemType {
  if (value === 'MATERIAL') return 'MATERIAL';
  return 'WORK'; // По умолчанию — работа
}

/**
 * Промпт для обогащения строительных работ нормативными документами.
 * Возвращает JSON-массив применимых СП/ГОСТ/СНиП.
 */
const NORMATIVES_PROMPT = `Ты — эксперт ПТО в строительстве России.
Для строительной работы укажи применимые нормативные документы (СП, ГОСТ, СНиП, ФЗ).

Верни ТОЛЬКО JSON-массив строк. Пример:
["СП 70.13330.2012", "ГОСТ 7473-2010", "СНиП 3.03.01-87"]

Правила:
1. Указывай только реально существующие актуальные документы
2. Максимум 5 документов
3. Только СП, ГОСТ, СНиП, ФЗ — без пояснений
4. Верни пустой массив [] если документы неизвестны`;

/**
 * Обогащение одной строительной работы рекомендуемыми нормативами.
 * Никогда не кидает — при любой ошибке возвращает [].
 */
export async function enrichWorkWithNormatives(workName: string): Promise<string[]> {
  const apiKey = process.env.YANDEX_CLOUD_API_KEY ?? process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;

  if (!apiKey || !folderId) return [];

  // Rate limiting — используем общий lastRequestTime
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await sleep(MIN_REQUEST_INTERVAL - elapsed);
  }

  try {
    lastRequestTime = Date.now();

    const body = {
      modelUri: `gpt://${folderId}/yandexgpt/latest`,
      completionOptions: { stream: false, temperature: 0.1, maxTokens: '500' },
      messages: [
        { role: 'system', text: NORMATIVES_PROMPT },
        { role: 'user', text: `Работа: "${workName}"` },
      ],
    };

    const response = await fetch(YANDEX_GPT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Api-Key ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) return [];

    const data = await response.json() as YandexGptResponse;
    const resultText = data.result?.alternatives?.[0]?.message?.text;
    if (!resultText) return [];

    // Парсим JSON-массив строк
    const cleaned = resultText.trim();
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!arrayMatch) return [];

    const parsed = JSON.parse(arrayMatch[0]) as unknown[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => typeof item === 'string' && item.trim().length > 0)
      .slice(0, 5) as string[];
  } catch {
    return [];
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// === Типы ===

interface YandexGptResponse {
  result?: {
    alternatives?: Array<{
      message?: {
        text?: string;
      };
    }>;
  };
}

interface GptItem {
  name?: string;
  unit?: string | null;
  volume?: number | null;
  price?: number | null;
  total?: number | null;
  itemType?: string;
  parentIndex?: number | null;
}
