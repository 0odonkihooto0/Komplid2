import { describe, it, expect } from 'vitest';
import { successResponse, errorResponse } from '../api';
import type { PaginationMeta } from '@/types/api';

describe('successResponse', () => {
  it('возвращает JSON с success: true и переданными данными', async () => {
    const data = { id: 1, name: 'Тестовый проект' };
    const response = successResponse(data);
    const body = await response.json();

    expect(body).toEqual({
      success: true,
      data: { id: 1, name: 'Тестовый проект' },
    });
  });

  it('возвращает HTTP статус 200', () => {
    const response = successResponse({ ok: true });

    expect(response.status).toBe(200);
  });

  it('включает meta пагинации, если передана', async () => {
    const data = [{ id: 1 }, { id: 2 }];
    const meta: PaginationMeta = {
      page: 1,
      pageSize: 10,
      total: 50,
      totalPages: 5,
    };

    const response = successResponse(data, meta);
    const body = await response.json();

    expect(body).toEqual({
      success: true,
      data,
      meta: {
        page: 1,
        pageSize: 10,
        total: 50,
        totalPages: 5,
      },
    });
  });

  it('не включает meta, если она не передана', async () => {
    const response = successResponse('простое значение');
    const body = await response.json();

    expect(body.meta).toBeUndefined();
  });

  it('устанавливает Content-Type: application/json', () => {
    const response = successResponse(null);

    expect(response.headers.get('content-type')).toContain('application/json');
  });
});

describe('errorResponse', () => {
  it('возвращает JSON с success: false и текстом ошибки', async () => {
    const response = errorResponse('Объект не найден');
    const body = await response.json();

    expect(body).toEqual({
      success: false,
      error: 'Объект не найден',
    });
  });

  it('использует статус 400 по умолчанию', () => {
    const response = errorResponse('Ошибка валидации');

    expect(response.status).toBe(400);
  });

  it('позволяет задать произвольный HTTP статус', () => {
    expect(errorResponse('Не авторизован', 401).status).toBe(401);
    expect(errorResponse('Доступ запрещён', 403).status).toBe(403);
    expect(errorResponse('Внутренняя ошибка', 500).status).toBe(500);
  });

  it('включает details, если переданы', async () => {
    const details = {
      fields: { name: 'Обязательное поле', inn: 'Неверный формат ИНН' },
    };
    const response = errorResponse('Ошибка валидации', 422, details);
    const body = await response.json();

    expect(body).toEqual({
      success: false,
      error: 'Ошибка валидации',
      details: {
        fields: { name: 'Обязательное поле', inn: 'Неверный формат ИНН' },
      },
    });
  });

  it('не включает details, если они не переданы', async () => {
    const response = errorResponse('Ошибка');
    const body = await response.json();

    expect(body.details).toBeUndefined();
  });
});
