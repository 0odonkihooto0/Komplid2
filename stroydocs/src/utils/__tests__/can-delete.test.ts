import { describe, it, expect } from 'vitest';
import { canDelete } from '../can-delete';
import type { UserRole } from '@prisma/client';

const ADMIN = 'ADMIN' as UserRole;
const MEMBER = 'MEMBER' as UserRole;

describe('canDelete', () => {
  it('ADMIN возвращает true независимо от createdById', () => {
    expect(canDelete('user-1', ADMIN, 'user-2')).toBe(true);
  });

  it('владелец записи (createdById === currentUserId) возвращает true', () => {
    expect(canDelete('user-1', MEMBER, 'user-1')).toBe(true);
  });

  it('не-владелец возвращает false', () => {
    expect(canDelete('user-1', MEMBER, 'user-2')).toBe(false);
  });

  it('createdById === null возвращает false для не-admin', () => {
    expect(canDelete('user-1', MEMBER, null)).toBe(false);
  });

  it('createdById === undefined возвращает false для не-admin', () => {
    expect(canDelete('user-1', MEMBER, undefined)).toBe(false);
  });
});
