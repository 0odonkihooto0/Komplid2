import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { renderHtmlToPdf } from '@/lib/pdf-generator';

/** Перевод статусов задач ГПР на русский */
const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Не начата',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершена',
  DELAYED: 'Задержка',
  ON_HOLD: 'Приостановлена',
};

/** Формат даты DD.MM.YYYY */
function fmtDate(d: Date | null): string {
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

/** Цвет полоски Ганта по типу задачи */
function barColor(level: number, isCritical: boolean): string {
  if (isCritical) return '#EF4444'; // Критический путь — красный
  if (level === 0) return '#2563EB'; // Секция — синий (StroyDocs primary)
  return '#22C55E'; // Обычная задача — зелёный
}

/** Вычисление процентной позиции даты внутри диапазона проекта */
function pct(date: Date, minMs: number, rangeMs: number): number {
  if (rangeMs <= 0) return 0;
  return Math.max(0, Math.min(100, ((date.getTime() - minMs) / rangeMs) * 100));
}

/**
 * Экспорт ГПР в PDF с мини-диаграммой Ганта.
 * Генерирует HTML и конвертирует через Puppeteer (A4 альбомная).
 */
export async function exportGprToPdf(versionId: string): Promise<Buffer> {
  logger.info({ versionId }, 'Экспорт ГПР в PDF');

  const [version, tasks] = await Promise.all([
    db.ganttVersion.findFirst({ where: { id: versionId }, select: { name: true } }),
    db.ganttTask.findMany({
      where: { versionId },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true, name: true, level: true, sortOrder: true,
        planStart: true, planEnd: true, factStart: true, factEnd: true,
        progress: true, status: true, volume: true, volumeUnit: true,
        amount: true, parentId: true, isCritical: true,
      },
    }),
  ]);

  const versionName = version?.name ?? 'Без названия';

  // Границы проекта для мини-диаграммы
  const allStarts = tasks.map((t) => t.planStart.getTime());
  const allEnds = tasks.map((t) => t.planEnd.getTime());
  const projectMin = allStarts.length > 0 ? Math.min(...allStarts) : Date.now();
  const projectMax = allEnds.length > 0 ? Math.max(...allEnds) : Date.now();
  const rangeMs = projectMax - projectMin || 1; // Защита от деления на ноль

  // Генерация строк таблицы
  const rows: string[] = [];
  for (const [idx, t] of Array.from(tasks.entries())) {
    const isSection = t.level === 0;
    const rowStyle = isSection ? 'background:#f3f4f6;font-weight:bold;' : '';

    // Мини-полоска Ганта
    const left = pct(t.planStart, projectMin, rangeMs);
    const right = pct(t.planEnd, projectMin, rangeMs);
    const width = Math.max(right - left, 0.5); // Минимум 0.5% для видимости
    const color = barColor(t.level, t.isCritical);

    const barHtml =
      `<div style="position:relative;height:14px;background:#e5e7eb;border-radius:2px;">` +
      `<div style="position:absolute;left:${left}%;width:${width}%;height:100%;background:${color};border-radius:2px;"></div>` +
      `</div>`;

    // Разрыв страницы каждые 30 строк (кроме последней группы)
    const pageBreak = (idx + 1) % 30 === 0 && idx < tasks.length - 1
      ? 'page-break-after:always;'
      : '';

    rows.push(
      `<tr style="${rowStyle}${pageBreak}">` +
      `<td>${idx + 1}</td>` +
      `<td style="text-align:left;">${escapeHtml(t.name)}</td>` +
      `<td>${t.volumeUnit ?? ''}</td>` +
      `<td>${t.volume != null ? t.volume : ''}</td>` +
      `<td style="text-align:right;">${t.amount != null ? formatMoney(t.amount) : ''}</td>` +
      `<td>${fmtDate(t.planStart)}</td>` +
      `<td>${fmtDate(t.planEnd)}</td>` +
      `<td>${fmtDate(t.factStart)}</td>` +
      `<td>${fmtDate(t.factEnd)}</td>` +
      `<td>${Math.round(t.progress)}%</td>` +
      `<td>${STATUS_LABELS[t.status] ?? t.status}</td>` +
      `<td style="min-width:120px;">${barHtml}</td>` +
      `</tr>`,
    );
  }

  const html = `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8">
<style>
  @page { size: A4 landscape; margin: 10mm; }
  body { font-family: sans-serif; font-size: 10px; color: #1f2937; margin: 0; }
  h2 { font-size: 14px; margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #d1d5db; padding: 3px 4px; text-align: center; vertical-align: middle; }
  th { background: #d9d9d9; font-weight: bold; }
</style>
</head>
<body>
  <h2>ГПР &mdash; ${escapeHtml(versionName)}</h2>
  <table>
    <thead>
      <tr>
        <th>№</th><th>Наименование</th><th>Ед.изм.</th><th>Кол-во</th>
        <th>Стоимость ₽</th><th>План нач.</th><th>План ок.</th>
        <th>Факт нач.</th><th>Факт ок.</th><th>Прогресс</th><th>Статус</th><th>Диаграмма</th>
      </tr>
    </thead>
    <tbody>
      ${rows.join('\n      ')}
    </tbody>
  </table>
</body>
</html>`;

  return renderHtmlToPdf(html);
}

/** Экранирование HTML-спецсимволов */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Форматирование суммы с разделителями тысяч */
function formatMoney(n: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
