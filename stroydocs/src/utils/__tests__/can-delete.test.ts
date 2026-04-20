import { describe, it, expect } from 'vitest';
import { canDelete } from '../can-delete';
import type { UserRole } from '@prisma/client';

const ADMIN = 'ADMIN' as UserRole;
const MANAGER = 'MANAGER' as UserRole;
const WORKER = 'WORKER' as UserRole;
const CONTROLLER = 'CONTROLLER' as UserRole;
const CUSTOMER = 'CUSTOMER' as UserRole;

describe('canDelete', () => {
  it('ADMIN возвращает true независимо от createdById', () => {
    expect(canDelete('user-1', ADMIN, 'user-2')).toBe(true);
  });

  it('владелец записи (createdById === currentUserId) возвращает true', () => {
    expect(canDelete('user-1', MANAGER, 'user-1')).toBe(true);
  });

  it('не-владелец MANAGER возвращает false', () => {
    expect(canDelete('user-1', MANAGER, 'user-2')).toBe(false);
  });

  it('не-владелец WORKER возвращает false', () => {
    expect(canDelete('user-1', WORKER, 'user-2')).toBe(false);
  });

  it('не-владелец CONTROLLER возвращает false', () => {
    expect(canDelete('user-1', CONTROLLER, 'user-2')).toBe(false);
  });

  it('не-владелец CUSTOMER возвращает false', () => {
    expect(canDelete('user-1', CUSTOMER, 'user-2')).toBe(false);
  });

  it('createdById === null возвращает false для не-admin', () => {
    expect(canDelete('user-1', MANAGER, null)).toBe(false);
  });

  it('createdById === undefined возвращает false для не-admin', () => {
    expect(canDelete('user-1', WORKER, undefined)).toBe(false);
  });

  it('пустая строка currentUserId возвращает false для не-admin', () => {
    expect(canDelete('', MANAGER, 'user-2')).toBe(false);
  });
});
