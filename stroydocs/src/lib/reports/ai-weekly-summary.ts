/**
 * AI-еженедельная сводка хода строительства.
 * Собирает данные за 7 дней и формирует текстовое резюме через YandexGPT.
 * Fallback: Gemini при недоступности YandexGPT, или текстовое резюме без AI.
 */

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

const YANDEX_GPT_ENDPOINT =
  'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

const MIN_REQUEST_INTERVAL = 1000;
let lastSummaryRequestTime = 0;

export interface WeeklySummaryResult {
  summary: string;
  dataCollected: boolean;
  weekStart: Date;
  weekEnd: Date;
}

/**
 * Генерирует AI-сводку хода строительства объекта за неделю.
 * Читает DailyLog, Defect, GanttTask, ExecutionDoc за указанный период.
 */
export async function generateAiWeeklySummary(
  projectId: string,
  organizationId: string,
  weekStartInput?: Date
): Promise<WeeklySummaryResult> {
  const weekEnd = new Date();
  weekEnd.setHours(23, 59, 59, 999);

  const weekStart = weekStartInput ?? (() => {
    const d = new Date(weekEnd);
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  // Проверяем принадлежность объекта к организации
  const buildingObj = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true, name: true, address: true },
  });

  if (!buildingObj) {
    return {
      summary: 'Объект строительства не найден.',
      dataCollected: false,
      weekStart,
      weekEnd,
    };
  }

  // Сбор данных параллельно
  const [dailyLogs, newDefects, closedDefects, gprDeviations, newAosr] = await Promise.all([
    // Дневники прораба за неделю
    db.dailyLog.findMany({
      where: {
        contract: { projectId },
        date: { gte: weekStart, lte: weekEnd },
      },
      orderBy: { date: 'asc' },
      take: 50,
      select: { date: true, weather: true, temperature: true, workersCount: true, notes: true },
    }),

    // Новые дефекты за неделю
    db.defect.findMany({
      where: {
        projectId,
        createdAt: { gte: weekStart, lte: weekEnd },
      },
      take: 20,
      select: { title: true, category: true, status: true },
    }),

    // Закрытые дефекты за неделю
    db.defect.findMany({
      where: {
        projectId,
        resolvedAt: { gte: weekStart, lte: weekEnd },
      },
      take: 20,
      select: { title: true, category: true },
    }),

    // Критичные отклонения по ГПР (план просрочен, не завершено)
    db.ganttTask.findMany({
      where: {
        version: { projectId, isActive: true },
        planEnd: { lt: weekEnd },
        factEnd: null,
        progress: { lt: 100 },
        level: { gt: 0 },
        isMilestone: false,
      },
      orderBy: { planEnd: 'asc' },
      take: 10,
      select: { name: true, planEnd: true, progress: true, isCritical: true },
    }),

    // Новые АОСР за неделю
    db.executionDoc.findMany({
      where: {
        contract: { projectId },
        type: 'AOSR',
        createdAt: { gte: weekStart, lte: weekEnd },
      },
      take: 20,
      select: { title: true, status: true },
    }),
  ]);

  const dataCollected =
    dailyLogs.length > 0 ||
    newDefects.length > 0 ||
    gprDeviations.length > 0 ||
    newAosr.length > 0;

  // Форматируем данные для промпта
  const dateRange = `${formatDate(weekStart)} — ${formatDate(weekEnd)}`;

  const dailyLogsText = dailyLogs.length === 0
    ? 'Записи отсутствуют'
    : dailyLogs.map((d) =>
        `${formatDate(d.date)}: погода=${d.weather ?? '—'}, t=${d.temperature ?? '?'}°C, рабочих=${d.workersCount ?? '?'}${d.notes ? `, заметки: ${d.notes}` : ''}`
      ).join('\n');

  const defectsText = (newDefects.length === 0 && closedDefects.length === 0)
    ? 'Нет изменений'
    : [
        newDefects.length > 0 ? `Новые (${newDefects.length}): ${newDefects.map((d) => d.title).join(', ')}` : '',
        closedDefects.length > 0 ? `Закрытые (${closedDefects.length}): ${closedDefects.map((d) => d.title).join(', ')}` : '',
      ].filter(Boolean).join('; ');

  const today = new Date();
  const gprText = gprDeviations.length === 0
    ? 'Все работы в графике'
    : gprDeviations.map((t) => {
        const daysLate = Math.round((today.getTime() - new Date(t.planEnd).getTime()) / 86400000);
        return `«${t.name}» — отставание ${daysLate} дн., выполнено ${t.progress.toFixed(0)}%${t.isCritical ? ' (критический путь)' : ''}`;
      }).join('\n');

  const aosrText = newAosr.length === 0
    ? 'Новых АОСР нет'
    : newAosr.map((d) => d.title).join(', ');

  const prompt = `Составь краткую сводку хода строительства объекта «${buildingObj.name}» за неделю ${dateRange}.

Данные за период:
1. Дневники прораба:
${dailyLogsText}

2. Дефекты (новые/закрытые):
${defectsText}

3. Отклонения по ГПР:
${gprText}

4. Новые АОСР:
${aosrText}

Напиши краткий аналитический отчёт на русском языке (200–300 слов).
Структура: итог по ресурсам и погоде → ход работ и отклонения → качество (дефекты) → исполнительная документация → ключевые риски и рекомендации.
Пиши профессионально, без воды.`;

  try {
    const summary = await callYandexGptForSummary(prompt);
    return { summary, dataCollected, weekStart, weekEnd };
  } catch (yandexError) {
    logger.warn({ err: yandexError }, 'YandexGPT недоступен для AI-сводки, пробуем Gemini');

    try {
      const summary = await callGeminiForSummary(prompt);
      return { summary, dataCollected, weekStart, weekEnd };
    } catch (geminiError) {
      logger.warn({ err: geminiError }, 'Gemini недоступен, возвращаем текстовую сводку');
      // Fallback: текстовая сводка без AI
      const summary = buildTextSummary(
        buildingObj.name,
        dateRange,
        dailyLogs.length,
        newDefects.length,
        closedDefects.length,
        gprDeviations.length,
        newAosr.length
      );
      return { summary, dataCollected, weekStart, weekEnd };
    }
  }
}

/** Вызов YandexGPT для генерации сводки (temperature 0.3 — выше чем при парсинге) */
async function callYandexGptForSummary(prompt: string): Promise<string> {
  const apiKey = process.env.YANDEX_CLOUD_API_KEY ?? process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;

  if (!apiKey || !folderId) {
    throw new Error('YandexGPT: YANDEX_API_KEY и YANDEX_FOLDER_ID не заданы');
  }

  // Rate limiting
  const elapsed = Date.now() - lastSummaryRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await sleep(MIN_REQUEST_INTERVAL - elapsed);
  }

  const body = {
    modelUri: `gpt://${folderId}/yandexgpt/latest`,
    completionOptions: { stream: false, temperature: 0.3, maxTokens: '1500' },
    messages: [
      {
        role: 'system',
        text: 'Ты — аналитик строительного контроля. Составляй чёткие, профессиональные сводки о ходе строительства на русском языке.',
      },
      { role: 'user', text: prompt },
    ],
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    lastSummaryRequestTime = Date.now();
    const response = await fetch(YANDEX_GPT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Api-Key ${apiKey}` },
      body: JSON.stringify(body),
    });

    if (response.status === 429 || response.status >= 500) {
      await sleep(Math.pow(2, attempt + 1) * 1000);
      continue;
    }

    if (!response.ok) {
      throw new Error(`YandexGPT error ${response.status}`);
    }

    const data = await response.json() as { result?: { alternatives?: Array<{ message?: { text?: string } }> } };
    const text = data.result?.alternatives?.[0]?.message?.text;
    if (!text) throw new Error('YandexGPT вернул пустой ответ');
    return text.trim();
  }

  throw new Error('YandexGPT: все попытки исчерпаны');
}

/** Fallback на Gemini */
async function callGeminiForSummary(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY не задан');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const body = {
    system_instruction: {
      parts: [{ text: 'Ты — аналитик строительного контроля. Составляй чёткие, профессиональные сводки о ходе строительства на русском языке.' }],
    },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`Gemini error ${response.status}`);

  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini вернул пустой ответ');
  return text.trim();
}

/** Текстовая сводка без AI — используется если оба провайдера недоступны */
function buildTextSummary(
  objectName: string,
  dateRange: string,
  logsCount: number,
  newDefects: number,
  closedDefects: number,
  gprDeviations: number,
  newAosr: number
): string {
  const lines = [
    `Еженедельная сводка: ${objectName} (${dateRange})`,
    '',
    `Дневников прораба за период: ${logsCount}.`,
    `Новых дефектов: ${newDefects}. Закрытых дефектов: ${closedDefects}.`,
    `Задач с отклонением от ГПР: ${gprDeviations}.`,
    `Новых АОСР: ${newAosr}.`,
    '',
    'AI-сервис недоступен. Подробная аналитическая сводка не сформирована. Проверьте настройки YANDEX_API_KEY и GEMINI_API_KEY.',
  ];
  return lines.join('\n');
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
