import { describe, it, expect } from 'vitest';
import { isWeekend, workingDaysBetween, addWorkingDays } from '../workingDays';

describe('isWeekend', () => {
  it('возвращает true для субботы', () => expect(isWeekend(new Date('2024-01-06'))).toBe(true));
  it('возвращает true для воскресенья', () => expect(isWeekend(new Date('2024-01-07'))).toBe(true));
  it('возвращает false для понедельника', () => expect(isWeekend(new Date('2024-01-08'))).toBe(false));
  it('возвращает false для среды', () => expect(isWeekend(new Date('2024-01-10'))).toBe(false));
  it('возвращает false для пятницы', () => expect(isWeekend(new Date('2024-01-12'))).toBe(false));
});

describe('workingDaysBetween', () => {
  it('возвращает 0 если from === to', () =>
    expect(workingDaysBetween(new Date('2024-01-08'), new Date('2024-01-08'))).toBe(0));
  it('возвращает 0 если from > to', () =>
    expect(workingDaysBetween(new Date('2024-01-10'), new Date('2024-01-08'))).toBe(0));
  it('считает 5 рабочих дней с пн по пт', () =>
    expect(workingDaysBetween(new Date('2024-01-08'), new Date('2024-01-13'))).toBe(5));
  it('исключает выходные из подсчёта (пт → пн = 1 день)', () =>
    expect(workingDaysBetween(new Date('2024-01-12'), new Date('2024-01-15'))).toBe(1));
  it('считает 10 рабочих дней за 2 полные недели', () =>
    expect(workingDaysBetween(new Date('2024-01-08'), new Date('2024-01-22'))).toBe(10));

  it('игнорирует время — пн 09:00 → пт 17:00 = 5 рабочих дней', () =>
    expect(workingDaysBetween(new Date('2024-01-08T09:00:00'), new Date('2024-01-13T17:00:00'))).toBe(5));

  it('начало в субботу — (сб → пн) = 0 рабочих дней', () =>
    expect(workingDaysBetween(new Date('2024-01-13'), new Date('2024-01-15'))).toBe(0));

  it('конец в воскресенье — (ср → вс) = 3 рабочих дня', () =>
    expect(workingDaysBetween(new Date('2024-01-10'), new Date('2024-01-14'))).toBe(3));

  it('переход через високосный год (28 фев → 1 мар 2024) = 2 дня', () =>
    expect(workingDaysBetween(new Date('2024-02-28'), new Date('2024-03-01'))).toBe(2));

  it('переход через новый год (29 дек 2023 → 2 янв 2024) = 2 рабочих дня', () =>
    expect(workingDaysBetween(new Date('2023-12-29'), new Date('2024-01-02'))).toBe(2));
});

describe('addWorkingDays', () => {
  const ymd = (date: Date) => date.toISOString().slice(0, 10);

  it('возвращает ту же дату при n=0', () =>
    expect(ymd(addWorkingDays(new Date('2024-01-08'), 0))).toBe('2024-01-08'));
  it('добавляет 1 рабочий день к понедельнику → вторник', () =>
    expect(ymd(addWorkingDays(new Date('2024-01-08'), 1))).toBe('2024-01-09'));
  it('пропускает выходные: пт + 3 → среда', () =>
    expect(ymd(addWorkingDays(new Date('2024-01-12'), 3))).toBe('2024-01-17'));
  it('начало в субботу + 1 → понедельник', () =>
    expect(ymd(addWorkingDays(new Date('2024-01-13'), 1))).toBe('2024-01-15'));
  it('не мутирует исходную дату', () => {
    const orig = new Date('2024-01-08');
    const iso = orig.toISOString();
    addWorkingDays(orig, 5);
    expect(orig.toISOString()).toBe(iso);
  });
});
