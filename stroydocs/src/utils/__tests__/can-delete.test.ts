import { describe, it, expect } from 'vitest';
import { canDelete } from '../can-delete';
import type { UserRole } from '@prisma/client';

const NON_ADMIN_ROLES: UserRole[] = ['MANAGER', 'WORKER', 'CONTROLLER', 'CUSTOMER'];

describe('canDelete', () => {
  it('ADMIN возвращает true независимо от createdById', () => {
    expect(canDelete('user-1', 'ADMIN', 'user-2')).toBe(true);
    expect(canDelete('user-1', 'ADMIN', null)).toBe(true);
    expect(canDelete('user-1', 'ADMIN', undefined)).toBe(true);
    expect(canDelete('user-1', 'ADMIN', '')).toBe(true);
  });

  NON_ADMIN_ROLES.forEach(role => {
    describe(`для роли ${role}`, () => {
      it('владелец записи (createdById === currentUserId) возвращает true', () => {
        expect(canDelete('user-1', role, 'user-1')).toBe(true);
      });

      it('не-владелец возвращает false', () => {
        expect(canDelete('user-1', role, 'user-2')).toBe(false);
      });

      it('createdById === null возвращает false', () => {
        expect(canDelete('user-1', role, null)).toBe(false);
      });

      it('createdById === undefined возвращает false', () => {
        expect(canDelete('user-1', role, undefined)).toBe(false);
      });

      it('пустые строки для ID обрабатываются корректно', () => {
        expect(canDelete('', role, '')).toBe(true);
        expect(canDelete('user-1', role, '')).toBe(false);
        expect(canDelete('', role, 'user-2')).toBe(false);
      });
    });
  });
});
