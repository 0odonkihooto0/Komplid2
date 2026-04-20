import { describe, it, expect } from 'vitest';
import { getClientIp } from '../rate-limit';

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
});
