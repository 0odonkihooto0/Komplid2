import { describe, it, expect } from 'vitest';
import { formatFullName, formatDate, formatInn, formatRole } from '../format';

describe('formatFullName', () => {
  it('возвращает фамилию и имя, если отчество не указано', () => {
    const result = formatFullName({ lastName: 'Иванов', firstName: 'Иван' });
    expect(result).toBe('Иванов Иван');
  });

  it('возвращает фамилию, имя и отчество', () => {
    const result = formatFullName({
      lastName: 'Иванов',
      firstName: 'Иван',
      middleName: 'Иванович',
    });
    expect(result).toBe('Иванов Иван Иванович');
  });

  it('игнорирует middleName = null', () => {
    const result = formatFullName({
      lastName: 'Петрова',
      firstName: 'Мария',
      middleName: null,
    });
    expect(result).toBe('Петрова Мария');
  });

  it('игнорирует middleName = пустая строка', () => {
    const result = formatFullName({
      lastName: 'Сидоров',
      firstName: 'Алексей',
      middleName: '',
    });
    expect(result).toBe('Сидоров Алексей');
  });
});

describe('formatDate', () => {
  it('форматирует объект Date в русский формат dd.mm.yyyy', () => {
    const result = formatDate(new Date(2024, 0, 15)); // 15 января 2024
    expect(result).toBe('15.01.2024');
  });

  it('форматирует строку даты в русский формат', () => {
    const result = formatDate('2024-06-01T00:00:00.000Z');
    expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  });
});

describe('formatInn', () => {
  it('возвращает ИНН без изменений (10 цифр)', () => {
    expect(formatInn('7707083893')).toBe('7707083893');
  });

  it('возвращает ИНН без изменений (12 цифр)', () => {
    expect(formatInn('770708389312')).toBe('770708389312');
  });
});

describe('formatRole', () => {
  it('возвращает "Администратор" для ADMIN', () => {
    expect(formatRole('ADMIN' as never)).toBe('Администратор');
  });

  it('возвращает "Менеджер" для MANAGER', () => {
    expect(formatRole('MANAGER' as never)).toBe('Менеджер');
  });

  it('возвращает "Работник" для WORKER', () => {
    expect(formatRole('WORKER' as never)).toBe('Работник');
  });

  it('возвращает "Контролёр" для CONTROLLER', () => {
    expect(formatRole('CONTROLLER' as never)).toBe('Контролёр');
  });

  it('возвращает "Заказчик" для CUSTOMER', () => {
    expect(formatRole('CUSTOMER' as never)).toBe('Заказчик');
  });

  it('возвращает саму роль, если метка не найдена', () => {
    expect(formatRole('UNKNOWN_ROLE' as never)).toBe('UNKNOWN_ROLE');
  });
});
