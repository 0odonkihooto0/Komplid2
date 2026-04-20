import { describe, it, expect } from 'vitest';
import { getClientIp } from '../rate-limit';

describe('getClientIp', () => {
  it('should return the first IP from x-forwarded-for header', () => {
    const req = {
      headers: {
        get: (name: string) => {
          if (name === 'x-forwarded-for') return '192.168.1.1, 10.0.0.1';
          return null;
        }
      }
    };
    expect(getClientIp(req)).toBe('192.168.1.1');
  });

  it('should trim the IP from x-forwarded-for header', () => {
    const req = {
      headers: {
        get: (name: string) => {
          if (name === 'x-forwarded-for') return ' 192.168.1.2 , 10.0.0.2';
          return null;
        }
      }
    };
    expect(getClientIp(req)).toBe('192.168.1.2');
  });

  it('should return the IP from x-real-ip header if x-forwarded-for is missing', () => {
    const req = {
      headers: {
        get: (name: string) => {
          if (name === 'x-real-ip') return '10.0.0.3';
          return null;
        }
      }
    };
    expect(getClientIp(req)).toBe('10.0.0.3');
  });

  it('should return req.ip if both x-forwarded-for and x-real-ip headers are missing', () => {
    const req = {
      headers: {
        get: () => null
      },
      ip: '172.16.0.1'
    };
    expect(getClientIp(req)).toBe('172.16.0.1');
  });

  it('should return "unknown" if no IP is provided in headers or req.ip', () => {
    const req = {
      headers: {
        get: () => null
      }
    };
    expect(getClientIp(req)).toBe('unknown');
  });
});
