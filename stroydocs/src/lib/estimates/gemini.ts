/**
 * Gemini fallback для парсинга строительных смет.
 * Используется автоматически когда YandexGPT недоступен или сработал safety-фильтр.
 *
 * ВАЖНО: Gemini использует серверы Google (не РФ).
 * Применять только для некритичных данных (структура сметы, не персданные).
 * Персональные данные через Gemini не передавать (ФЗ-152).
 */

import { logger } from '@/lib/logger';
import type { ParsedEstimateItem, EstimateItemType } from './types';

const GEMINI_API_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/** Системный промпт — аналогичен YandexGPT для единообразия результатов */
const GEMINI_SYSTEM_PROMPT = `Ты — эксперт по строительным сметам России. Извлеки из текста строительной сметы список позиций.

Верни JSON-массив объектов с полями:
- name (string) — наименование работы или материала
- unit (string | null) — единица измерения
- volume (number | null) — объём (пропусти позицию если volume = 0)
- price (number | null) — цена за единицу
- total (number | null) — итоговая сумма
- itemType ("WORK" | "MATERIAL") — WORK если это работа (Монтаж, Укладка, Устройство...), MATERIAL если материал (Бетон, Труба, Арматура...)
- parentIndex (number | null) — 0-based индекс родительской работы для материала, null для работ

Верни ТОЛЬКО валидный JSON-массив без пояснений и markdown.`;

/**
 * Парсинг текста сметы через Google Gemini.
 * Вызывается как fallback при недоступности YandexGPT.
 */
export async function parseWithGemini(text: string): Promise<ParsedEstimateItem[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY не задан в .env. Gemini fallback недоступен.');
  }

  logger.info({ textLength: text.length }, 'Gemini fallback: отправка запроса');

  const url = `${GEMINI_API_ENDPOINT}?key=${apiKey}`;

  const body = {
    system_instruction: {
      parts: [{ text: GEMINI_SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: `Текст сметы:\n${text}` }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
    },
  };

  let lastError: Error | null = null;

  // Retry: 3 попытки с задержкой 1 сек
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.status === 429) {
        await sleep(2000 * (attempt + 1));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errorText}`);
      }

      const data = await response.json() as GeminiResponse;
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!resultText) {
        logger.warn({ data }, 'Gemini вернул пустой ответ');
        return [];
      }

      logger.info({ responseLength: resultText.length }, 'Gemini ответ получен');
      return parseGeminiResponse(resultText);
    } catch (error) {
      lastError = error as Error;
      logger.error({ error, attempt }, 'Ошибка запроса к Gemini');
      if (attempt < 2) await sleep(1000 * (attempt + 1));
    }
  }

  throw lastError || new Error('Gemini: все попытки исчерпаны');
}

/**
 * Парсинг одного чанка (2D строки) через Gemini.
 * Аналог parseChunkWithYandexGpt.
 */
export async function parseChunkWithGemini(
  headers: string[],
  rows: string[][]
): Promise<ParsedEstimateItem[]> {
  const headerLine = headers.join(' | ');
  const dataLines = rows.map((row, i) =>
    `Строка ${i + 1}: ${row.map((cell, j) => `${headers[j] || `Кол${j + 1}`}: ${cell}`).join(' | ')}`
  );
  const text = `Заголовки: ${headerLine}\n\n${dataLines.join('\n')}`;

  return parseWithGemini(text);
}

/** Парсинг JSON из ответа Gemini (аналогичен YandexGPT) */
function parseGeminiResponse(text: string): ParsedEstimateItem[] {
  let cleaned = text.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!arrayMatch) {
    logger.warn({ text: cleaned.substring(0, 200) }, 'Не найден JSON-массив в ответе Gemini');
    return [];
  }

  try {
    const parsed = JSON.parse(arrayMatch[0]) as GeminiItem[];
    return parsed
      .filter((item) => item.name && item.name.trim().length > 0)
      .filter((item) => item.volume !== 0)
      .map((item, index) => ({
        sortOrder: index + 1,
        rawName: String(item.name).trim(),
        rawUnit: item.unit ? String(item.unit).trim() : null,
        volume: typeof item.volume === 'number' ? item.volume : null,
        price: typeof item.price === 'number' ? item.price : null,
        total: typeof item.total === 'number' ? item.total : null,
        itemType: (item.itemType === 'MATERIAL' ? 'MATERIAL' : 'WORK') as EstimateItemType,
        parentIndex: typeof item.parentIndex === 'number' ? item.parentIndex : undefined,
      }));
  } catch (error) {
    logger.error({ error, text: cleaned.substring(0, 500) }, 'Ошибка парсинга JSON из Gemini');
    return [];
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// === Типы ===

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

interface GeminiItem {
  name?: string;
  unit?: string | null;
  volume?: number | null;
  price?: number | null;
  total?: number | null;
  itemType?: string;
  parentIndex?: number | null;
}
