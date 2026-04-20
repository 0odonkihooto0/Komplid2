import { describe, it, expect, vi } from 'vitest';
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

  it('пустой x-forwarded-for → fallback на x-real-ip', () => {
    const req = makeReq({ 'x-forwarded-for': '', 'x-real-ip': '5.5.5.5' });
    expect(getClientIp(req)).toBe('5.5.5.5');
  });
});

describe('checkRateLimit', () => {
  it('возвращает true для запросов в пределах лимита', () => {
    expect(checkRateLimit('test-key-1', 3, 60000)).toBe(true);
    expect(checkRateLimit('test-key-1', 3, 60000)).toBe(true);
    expect(checkRateLimit('test-key-1', 3, 60000)).toBe(true);
  });

  it('возвращает false при превышении лимита', () => {
    expect(checkRateLimit('test-key-2', 3, 60000)).toBe(true);
    expect(checkRateLimit('test-key-2', 3, 60000)).toBe(true);
    expect(checkRateLimit('test-key-2', 3, 60000)).toBe(true);
    expect(checkRateLimit('test-key-2', 3, 60000)).toBe(false);
  });

  it('сбрасывает лимит после истечения окна', () => {
    vi.useFakeTimers();
    expect(checkRateLimit('test-key-3', 3, 60000)).toBe(true);
    vi.advanceTimersByTime(60001);
    expect(checkRateLimit('test-key-3', 3, 60000)).toBe(true);
    vi.useRealTimers();
  });
});
