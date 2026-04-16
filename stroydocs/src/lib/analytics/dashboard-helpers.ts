import { logger } from '@/lib/logger';

/** YYYY-MM ключ для группировки по месяцам */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Диапазон дат по году и периоду */
export function getDateRange(year: number, period: string): { dateFrom: Date; dateTo: Date } {
  const dateFrom = new Date(year, 0, 1);
  let dateTo: Date;
  if (period === 'quarter') {
    dateTo = new Date(year, 2, 31, 23, 59, 59);
  } else if (period === 'halfyear') {
    dateTo = new Date(year, 5, 30, 23, 59, 59);
  } else {
    dateTo = new Date(year, 11, 31, 23, 59, 59);
  }
  return { dateFrom, dateTo };
}

/** Группировка задач ГПР и актов по месяцам */
export function buildGprMonthly(
  tasks: { planEnd: Date; amount: number | null; progress: number }[],
  acts: { periodEnd: Date; totalAmount: number | null }[],
) {
  const months: Record<string, { plan: number; factExec: number; factOsv: number }> = {};
  for (const t of tasks) {
    const k = monthKey(t.planEnd);
    months[k] ??= { plan: 0, factExec: 0, factOsv: 0 };
    months[k].plan += t.amount ?? 0;
    months[k].factExec += (t.amount ?? 0) * (t.progress / 100);
  }
  for (const a of acts) {
    const k = monthKey(a.periodEnd);
    months[k] ??= { plan: 0, factExec: 0, factOsv: 0 };
    months[k].factOsv += a.totalAmount ?? 0;
  }
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      plan: Math.round(v.plan),
      factExec: Math.round(v.factExec),
      deviationExec: Math.round(v.plan - v.factExec),
      factOsv: Math.round(v.factOsv),
      deviationOsv: Math.round(v.plan - v.factOsv),
    }));
}

/** Коды транзиентных ошибок Prisma — повтор может помочь */
const TRANSIENT_PRISMA_CODES = new Set(['P1001', 'P1008', 'P1017']);

function isTransientPrismaError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string' &&
    TRANSIENT_PRISMA_CODES.has((err as { code: string }).code)
  );
}

/** Защитная обёртка: ошибка одного запроса не ломает весь ответ.
 *  При транзиентной ошибке БД (P1001/P1008/P1017) делает одну повторную попытку через 500 мс. */
export async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    // Транзиентная ошибка — повторяем один раз после короткой паузы
    if (isTransientPrismaError(err)) {
      try {
        await new Promise((r) => setTimeout(r, 500));
        return await fn();
      } catch (retryErr) {
        logger.warn({ err: retryErr }, 'dashboard/analytics: повторная попытка не удалась');
        return fallback;
      }
    }
    logger.warn({ err }, 'dashboard/analytics: частичная ошибка агрегации');
    return fallback;
  }
}

/** _count из Prisma groupBy → number */
export function cnt(r: { _count: unknown }): number {
  return (r._count as { id: number }).id;
}
