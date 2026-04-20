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
  it('возвращает ту же дату при отрицательном n', () =>
    expect(ymd(addWorkingDays(new Date('2024-01-08'), -1))).toBe('2024-01-08'));
  it('корректно переходит через границу месяца (январь -> февраль)', () =>
    expect(ymd(addWorkingDays(new Date('2024-01-31'), 1))).toBe('2024-02-01'));
  it('корректно переходит через границу года', () =>
    expect(ymd(addWorkingDays(new Date('2023-12-29'), 1))).toBe('2024-01-01'));
  it('корректно обрабатывает високосный год (29 февраля)', () =>
    expect(ymd(addWorkingDays(new Date('2024-02-28'), 2))).toBe('2024-03-01'));
  it('не мутирует исходную дату', () => {
    const orig = new Date('2024-01-08');
    const iso = orig.toISOString();
    addWorkingDays(orig, 5);
    expect(orig.toISOString()).toBe(iso);
  });
});
