/**
 * Утилиты для работы с рабочими днями.
 * Рабочие дни = Пн–Пт (праздники не учитываются на старте).
 */

// Возвращает true если дата — выходной (Сб или Вс)
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Возвращает количество рабочих дней между двумя датами (0 если date1 >= date2)
export function workingDaysBetween(from: Date, to: Date): number {
  if (from >= to) return 0;
  let count = 0;
  const current = new Date(from);
  current.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (current < end) {
    if (!isWeekend(current)) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// Добавляет n рабочих дней к дате
export function addWorkingDays(date: Date, n: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < n) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) added++;
  }
  return result;
}
