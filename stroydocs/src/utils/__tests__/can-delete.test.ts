import { describe, it, expect } from 'vitest';
import { canDelete } from '../can-delete';
import type { UserRole } from '@prisma/client';

describe('canDelete', () => {
  it('should return true if user is ADMIN regardless of createdById', () => {
    expect(canDelete('admin-id', 'ADMIN' as UserRole, 'other-id')).toBe(true);
    expect(canDelete('admin-id', 'ADMIN' as UserRole, 'admin-id')).toBe(true);
    expect(canDelete('admin-id', 'ADMIN' as UserRole, null)).toBe(true);
    expect(canDelete('admin-id', 'ADMIN' as UserRole, undefined)).toBe(true);
  });

  it('should return true if user is not ADMIN but created the record', () => {
    expect(canDelete('user-1', 'USER' as UserRole, 'user-1')).toBe(true);
    expect(canDelete('manager-1', 'MANAGER' as UserRole, 'manager-1')).toBe(true);
  });

  it('should return false if user is not ADMIN and did not create the record', () => {
    expect(canDelete('user-1', 'USER' as UserRole, 'user-2')).toBe(false);
  });

  it('should return false if user is not ADMIN and createdById is null or undefined', () => {
    expect(canDelete('user-1', 'USER' as UserRole, null)).toBe(false);
    expect(canDelete('user-1', 'USER' as UserRole, undefined)).toBe(false);
  });
});
