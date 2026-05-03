/**
 * AI-юрист сервис для строительного права РФ.
 * Специализируется на: ГК РФ гл.37 (подряд), ФЗ-2300-1 (защита прав потребителей),
 * ГОСТ Р 70108-2025, строительные нормы и правила.
 *
 * Основной провайдер: YandexGPT (серверы РФ, ФЗ-152 compliant).
 * Fallback: Gemini (только если Yandex недоступен, персданные не передаём).
 */

import { logger } from '@/lib/logger';
import { YandexSafetyFilterError } from '@/lib/estimates/yandex-gpt';

const YANDEX_GPT_ENDPOINT =
  'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Системный промпт для AI-юриста в строительстве.
 * Фокус: ГК РФ гл.37, ФЗ-2300-1, ГОСТ Р 70108-2025.
 */
const SYSTEM_PROMPT = `Ты — опытный юрист по строительному праву России. Специализируешься на:
- ГК РФ глава 37 (строительный подряд, договоры подряда)
- ФЗ-2300-1 "О защите прав потребителей" (права заказчиков-физлиц)
- ГОСТ Р 70108-2025 (строительная документация)
- СП, СНиП, нормативы строительства
- Законодательство о долевом строительстве (ФЗ-214)
- Ответственность подрядчика за качество, сроки, смету

Правила ответов:
1. Отвечай на русском языке
2. Ссылайся на конкретные статьи законов
3. Давай практические рекомендации (что делать, в какой срок, куда обращаться)
4. Если вопрос требует участия адвоката — предупреди об этом
5. Не составляй исковые заявления — только консультация и шаблоны претензий
6. Будь конкретен и лаконичен

Ты помогаешь заказчикам строительных работ защитить свои права.`;

/** Формат сообщения для передачи в API */
export interface LawyerMessage {
  role: string;
  content: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Запрос к YandexGPT для AI-юриста.
 * 3 попытки с экспоненциальным backoff (аналогично yandex-gpt.ts).
 */
async function askYandexGpt(messages: LawyerMessage[]): Promise<string> {
  const apiKey = process.env.YANDEX_CLOUD_API_KEY ?? process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;

  if (!apiKey || !folderId) {
    throw new Error('YANDEX_CLOUD_API_KEY и YANDEX_FOLDER_ID должны быть заданы в .env');
  }

  // Ограничиваем контекст последними 10 сообщениями для экономии токенов
  const contextMessages = messages.slice(-10);

  const body = {
    modelUri: `gpt://${folderId}/yandexgpt/latest`,
    completionOptions: {
      stream: false,
      temperature: 0.3,
      maxTokens: '4000',
    },
    messages: [
      { role: 'system', text: SYSTEM_PROMPT },
      ...contextMessages.map((m) => ({ role: m.role, text: m.content })),
    ],
  };

  let lastError: Error | null = null;

  // Retry: 3 попытки с экспоненциальным backoff
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(YANDEX_GPT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Api-Key ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      // Rate limit или серверная ошибка — ждём и повторяем
      if (response.status === 429 || response.status >= 500) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        logger.warn(
          { status: response.status, attempt, delayMs: delay },
          'YandexGPT (lawyer) rate limit / server error, retrying'
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
        logger.warn({ data }, 'YandexGPT (lawyer) вернул пустой ответ');
        throw new Error('YandexGPT вернул пустой ответ');
      }

      // Проверяем safety-фильтр — при срабатывании переключаемся на Gemini
      detectSafetyFilter(resultText);

      logger.debug(
        { responseLength: resultText.length },
        'YandexGPT (lawyer) ответ получен'
      );
      return resultText;
    } catch (error) {
      // Safety filter — не ретраим, пробрасываем для Gemini fallback
      if (error instanceof YandexSafetyFilterError) throw error;

      lastError = error as Error;
      logger.error({ error, attempt }, 'Ошибка запроса к YandexGPT (lawyer)');

      if (attempt < 2) {
        await sleep(1000 * (attempt + 1));
      }
    }
  }

  throw lastError ?? new Error('YandexGPT (lawyer): все попытки исчерпаны');
}

/**
 * Fallback на Gemini при недоступности YandexGPT или safety-фильтре.
 * ВНИМАНИЕ: Gemini — серверы Google (не РФ). Персональные данные не передавать.
 */
async function askGemini(messages: LawyerMessage[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY не задан в .env. Gemini fallback недоступен.');
  }

  // Ограничиваем контекст последними 10 сообщениями
  const contextMessages = messages.slice(-10);

  const url = `${GEMINI_ENDPOINT}?key=${apiKey}`;

  const body = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: contextMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4000,
    },
  };

  let lastError: Error | null = null;

  // Retry: 3 попытки с задержкой
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
        logger.warn({ data }, 'Gemini (lawyer) вернул пустой ответ');
        throw new Error('Gemini вернул пустой ответ');
      }

      logger.info({ responseLength: resultText.length }, 'Gemini (lawyer) fallback ответ получен');
      return resultText;
    } catch (error) {
      lastError = error as Error;
      logger.error({ error, attempt }, 'Ошибка запроса к Gemini (lawyer)');
      if (attempt < 2) await sleep(1000 * (attempt + 1));
    }
  }

  throw lastError ?? new Error('Gemini (lawyer): все попытки исчерпаны');
}

/**
 * Проверяет, сработал ли safety-фильтр Yandex GPT.
 */
function detectSafetyFilter(text: string): void {
  const safetyPhrases = [
    'не могу обсуждать',
    'не могу помочь',
    'не могу обработать',
    'не могу выполнить',
    'не могу отвечать',
    'не предназначен для',
    'противоречит правилам',
    'нарушает правила',
    'я не в состоянии',
  ];

  const lower = text.toLowerCase();
  if (safetyPhrases.some((phrase) => lower.includes(phrase))) {
    logger.warn({ response: text.substring(0, 200) }, 'YandexGPT (lawyer) safety filter triggered');
    throw new YandexSafetyFilterError(
      'YandexGPT отклонил запрос (safety filter). Переключение на Gemini.'
    );
  }
}

/**
 * Основная функция AI-юриста.
 * Пробует YandexGPT, при safety-фильтре или недоступности — переключается на Gemini.
 *
 * @param messages История диалога (последние 10 будут переданы в API)
 * @returns Ответ AI-юриста
 */
export async function askLawyer(messages: LawyerMessage[]): Promise<string> {
  try {
    return await askYandexGpt(messages);
  } catch (error) {
    // При safety-фильтре или полной недоступности YandexGPT — Gemini fallback
    const isTransient =
      error instanceof YandexSafetyFilterError ||
      (error instanceof Error && error.message.includes('все попытки исчерпаны'));

    if (isTransient) {
      logger.warn(
        { errorMessage: error instanceof Error ? error.message : String(error) },
        'YandexGPT (lawyer) недоступен, переключение на Gemini fallback'
      );
      return await askGemini(messages);
    }

    throw error;
  }
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

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}
