import type { RuleContext, RuleViolation } from './rules';

const YANDEX_GPT_ENDPOINT =
  'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

const SYSTEM_PROMPT = `Ты — эксперт по исполнительной документации в строительстве Российской Федерации.
Специализируешься на ГОСТ Р 70108-2025, СП 48.13330.2019, СП 70.13330.2012, СП 71.13330.2017, РД-11-05-2007.
Стаж работы — 20 лет, опыт сдачи объектов Госстройнадзору.

ЗАДАЧА: Ты получаешь краткую опись исполнительной документации строительного объекта.
Детерминированные правила уже проверены. Тебе нужно выявить ДОПОЛНИТЕЛЬНЫЕ нарушения,
которые детерминированные правила не нашли (семантические, контекстуальные, логические).

ФОРМАТ ОТВЕТА: верни ТОЛЬКО валидный JSON-массив. Без markdown, без комментариев, без пояснений.
Каждый элемент массива:
{
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO",
  "category": "MISSING_DOCUMENT" | "MISSING_SIGNATURE" | "WRONG_DATE" | "INCONSISTENCY" | "MISSING_FIELD" | "FORMAT_ERROR" | "REGULATORY" | "MISSING_CERTIFICATE",
  "title": "Краткое название проблемы (до 80 символов)",
  "description": "Подробное описание нарушения",
  "affectedDocIds": ["uuid1", "uuid2"],
  "suggestedFix": "Что именно нужно сделать для устранения",
  "standard": "Ссылка на норматив (ГОСТ, СП, СНиП)"
}

Если нарушений не найдено — верни пустой массив [].
Не дублируй уже найденные нарушения (они переданы в контексте).
Максимум 10 дополнительных нарушений.`;

interface AiViolationRaw {
  severity?: string;
  category?: string;
  title?: string;
  description?: string;
  affectedDocIds?: string[];
  suggestedFix?: string;
  standard?: string;
}

interface YandexGptResponse {
  result?: {
    alternatives?: Array<{
      message?: { text?: string };
      status?: string;
    }>;
    usage?: {
      inputTextTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
  };
}

const VALID_SEVERITIES = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']);
const VALID_CATEGORIES = new Set([
  'MISSING_DOCUMENT', 'MISSING_SIGNATURE', 'WRONG_DATE',
  'INCONSISTENCY', 'MISSING_FIELD', 'FORMAT_ERROR', 'REGULATORY', 'MISSING_CERTIFICATE',
]);

export function buildCheckPrompt(ctx: RuleContext, existingViolations: RuleViolation[]): string {
  // Краткая сериализация контекста для экономии токенов
  const docSummary = ctx.docs.map((d) => ({
    id: d.id,
    type: d.type,
    status: d.status,
    number: d.number,
    title: d.title?.slice(0, 50),
    hasWorkRecord: !!d.workRecordId,
    hasPdf: !!d.s3Key,
    date: d.generatedAt ? new Date(d.generatedAt).toISOString().slice(0, 10) : null,
  }));

  const existingSummary = existingViolations.slice(0, 10).map((v) => ({
    severity: v.severity,
    title: v.title,
  }));

  return `Объект строительства: ${ctx.projectId}

ДОКУМЕНТЫ ИД (${ctx.docs.length} шт):
${JSON.stringify(docSummary, null, 2)}

ЗАПИСИ О РАБОТАХ: ${ctx.workRecords.length} шт
ДЕФЕКТЫ: ${ctx.defects.length} шт
ЖУРНАЛЬНЫХ ЗАПИСЕЙ: ${ctx.journalEntries.length} шт
ФОТОГРАФИЙ: ${ctx.photos.length} шт

УЖЕ НАЙДЕННЫЕ НАРУШЕНИЯ (не дублировать):
${JSON.stringify(existingSummary, null, 2)}

Найди дополнительные нарушения, не перечисленные выше.`;
}

export function parseAiResponse(raw: string): RuleViolation[] {
  try {
    // Извлечь JSON из ответа (убрать возможный markdown)
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as AiViolationRaw[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (v): v is Required<AiViolationRaw> =>
          typeof v.title === 'string' &&
          typeof v.description === 'string' &&
          VALID_SEVERITIES.has(v.severity ?? '') &&
          VALID_CATEGORIES.has(v.category ?? ''),
      )
      .map((v) => ({
        severity: v.severity as RuleViolation['severity'],
        category: v.category as RuleViolation['category'],
        title: v.title,
        description: v.description,
        affectedDocIds: Array.isArray(v.affectedDocIds) ? v.affectedDocIds : [],
        affectedJournalIds: [],
        suggestedFix: v.suggestedFix,
        standard: v.standard,
      }))
      .slice(0, 10);
  } catch {
    return [];
  }
}

export async function callYandexGptForCompliance(
  ctx: RuleContext,
  existingViolations: RuleViolation[],
): Promise<{ violations: RuleViolation[]; tokensUsed: number }> {
  const apiKey = process.env.YANDEX_CLOUD_API_KEY ?? process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;

  if (!apiKey || !folderId) {
    return { violations: [], tokensUsed: 0 };
  }

  const userMessage = buildCheckPrompt(ctx, existingViolations);

  const body = {
    modelUri: `gpt://${folderId}/yandexgpt/latest`,
    completionOptions: {
      stream: false,
      temperature: 0.1,
      maxTokens: '4000',
    },
    messages: [
      { role: 'system', text: SYSTEM_PROMPT },
      { role: 'user', text: userMessage },
    ],
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(YANDEX_GPT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Api-Key ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { violations: [], tokensUsed: 0 };
    }

    const data = (await response.json()) as YandexGptResponse;
    const text = data.result?.alternatives?.[0]?.message?.text ?? '';
    const tokensUsed = data.result?.usage?.totalTokens ?? 0;

    return {
      violations: parseAiResponse(text),
      tokensUsed,
    };
  } catch {
    return { violations: [], tokensUsed: 0 };
  } finally {
    clearTimeout(timeout);
  }
}

export async function callGeminiFallback(
  ctx: RuleContext,
  existingViolations: RuleViolation[],
): Promise<{ violations: RuleViolation[]; tokensUsed: number }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { violations: [], tokensUsed: 0 };

  const userMessage = buildCheckPrompt(ctx, existingViolations);

  const body = {
    contents: [
      {
        parts: [
          { text: SYSTEM_PROMPT + '\n\n' + userMessage },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4000,
    },
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    if (!response.ok) return { violations: [], tokensUsed: 0 };

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    return {
      violations: parseAiResponse(text),
      tokensUsed: 0,
    };
  } catch {
    return { violations: [], tokensUsed: 0 };
  }
}
