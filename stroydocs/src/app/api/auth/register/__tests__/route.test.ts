import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Мокаем Prisma
vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: vi.fn() },
    organization: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

// Мокаем bcryptjs
vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password'),
}));

// Мокаем logger
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { db } from '@/lib/db';

const mockedDb = vi.mocked(db);
// Typed aliases for mock assertions
const mockUserFindUnique = mockedDb.user.findUnique as unknown as Mock;
const mockOrgFindUnique = mockedDb.organization.findUnique as unknown as Mock;

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('возвращает 400 при пустом теле запроса', async () => {
    const req = createRequest({});
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Ошибка валидации');
    expect(body.details).toBeDefined();
  });

  it('возвращает 400 при невалидном email', async () => {
    const req = createRequest({
      organizationName: 'ООО Тест',
      inn: '7707083893',
      email: 'not-an-email',
      password: '123456',
      firstName: 'Иван',
      lastName: 'Иванов',
    });
    const response = await POST(req);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  it('возвращает 400 при коротком пароле', async () => {
    const req = createRequest({
      organizationName: 'ООО Тест',
      inn: '7707083893',
      email: 'test@example.com',
      password: '123',
      firstName: 'Иван',
      lastName: 'Иванов',
    });
    const response = await POST(req);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  it('возвращает 400 при коротком ИНН', async () => {
    const req = createRequest({
      organizationName: 'ООО Тест',
      inn: '123',
      email: 'test@example.com',
      password: '123456',
      firstName: 'Иван',
      lastName: 'Иванов',
    });
    const response = await POST(req);

    expect(response.status).toBe(400);
  });

  it('возвращает 409 при дублировании email', async () => {
    mockUserFindUnique.mockResolvedValue({ id: '1' });

    const req = createRequest({
      organizationName: 'ООО Тест',
      inn: '7707083893',
      email: 'existing@example.com',
      password: '123456',
      firstName: 'Иван',
      lastName: 'Иванов',
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain('email');
  });

  it('возвращает 409 при дублировании ИНН', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockOrgFindUnique.mockResolvedValue({ id: '1' });

    const req = createRequest({
      organizationName: 'ООО Тест',
      inn: '7707083893',
      email: 'new@example.com',
      password: '123456',
      firstName: 'Иван',
      lastName: 'Иванов',
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain('ИНН');
  });

  it('успешно регистрирует при валидных данных', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockOrgFindUnique.mockResolvedValue(null);
    mockedDb.$transaction.mockResolvedValue({
      organization: { id: 'org-1', name: 'ООО Тест', inn: '7707083893' },
      user: {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Иван',
        lastName: 'Иванов',
        role: 'ADMIN',
      },
    });

    const req = createRequest({
      organizationName: 'ООО Тест',
      inn: '7707083893',
      email: 'test@example.com',
      password: '123456',
      firstName: 'Иван',
      lastName: 'Иванов',
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe('test@example.com');
    expect(body.data.organization.inn).toBe('7707083893');
  });
});
