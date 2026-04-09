import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
  it('объединяет несколько классов', () => {
    expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
  });

  it('разрешает конфликты Tailwind в пользу последнего класса', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('поддерживает условные классы через clsx-синтаксис', () => {
    const isActive = true;
    const isDisabled = false;
    const result = cn('base', isActive && 'active', isDisabled && 'disabled');
    expect(result).toBe('base active');
  });

  it('корректно обрабатывает undefined и null', () => {
    expect(cn('base', undefined, null, 'extra')).toBe('base extra');
  });

  it('возвращает пустую строку без аргументов', () => {
    expect(cn()).toBe('');
  });
});
