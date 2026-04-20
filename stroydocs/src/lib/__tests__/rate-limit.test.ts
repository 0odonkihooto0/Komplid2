import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getClientIp, checkRateLimit } from '../rate-limit';

function makeReq(headers: Record<string, string | null>, ip?: string) {
  return {
    headers: { get: (name: string) => headers[name] ?? null },
    ip,
  };
}

describe('getClientIp', () => {
  it('берёт первый IP из multi-IP x-forwarded-for', () => {
    const req = makeReq({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('тримирует пробелы из x-forwarded-for', () => {
    const req = makeReq({ 'x-forwarded-for': ' 1.2.3.4 , 5.6.7.8' });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('использует x-real-ip при отсутствии x-forwarded-for', () => {
    const req = makeReq({ 'x-forwarded-for': null, 'x-real-ip': '9.9.9.9' });
    expect(getClientIp(req)).toBe('9.9.9.9');
  });

  it('использует req.ip при отсутствии заголовков', () => {
    const req = makeReq({ 'x-forwarded-for': null, 'x-real-ip': null }, '10.0.0.1');
    expect(getClientIp(req)).toBe('10.0.0.1');
  });

  it('возвращает "unknown" если нет ни заголовков, ни req.ip', () => {
    const req = makeReq({ 'x-forwarded-for': null, 'x-real-ip': null });
    expect(getClientIp(req)).toBe('unknown');
  });

  it('игнорирует пустой x-forwarded-for и использует x-real-ip', () => {
    const req = makeReq({ 'x-forwarded-for': '', 'x-real-ip': '8.8.8.8' });
    expect(getClientIp(req)).toBe('8.8.8.8');
  });
});

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('разрешает запросы в пределах лимита', () => {
    const key = 'ip-1';
    expect(checkRateLimit(key, 3, 1000)).toBe(true);
    expect(checkRateLimit(key, 3, 1000)).toBe(true);
    expect(checkRateLimit(key, 3, 1000)).toBe(true);
  });

  it('блокирует запросы при превышении лимита', () => {
    const key = 'ip-2';
    expect(checkRateLimit(key, 2, 1000)).toBe(true);
    expect(checkRateLimit(key, 2, 1000)).toBe(true);
    expect(checkRateLimit(key, 2, 1000)).toBe(false);
    expect(checkRateLimit(key, 2, 1000)).toBe(false);
  });

  it('сбрасывает лимит после истечения окна', () => {
    const key = 'ip-3';
    expect(checkRateLimit(key, 1, 1000)).toBe(true);
    expect(checkRateLimit(key, 1, 1000)).toBe(false);

    // Сдвигаем время на 1001мс
    vi.advanceTimersByTime(1001);

    expect(checkRateLimit(key, 1, 1000)).toBe(true);
  });
});
