import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { YookassaClient, getYookassaClient } from '../client';
import { YookassaValidationError, YookassaNetworkError } from '../errors';

// ─── Утилиты для мокирования fetch ───────────────────────────────────────────

function makeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

describe('YookassaClient', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  // ── Успешные запросы ────────────────────────────────────────────────────────

  it('GET-запрос: возвращает распарсенный JSON', async () => {
    const payload = { id: 'pay-123', status: 'succeeded' };
    mockFetch.mockResolvedValueOnce(makeResponse(200, payload));

    const client = new YookassaClient({ shopId: 'shop-1', secretKey: 'key-1', maxRetries: 1 });
    const result = await client.request({ method: 'GET', path: '/payments/pay-123' });

    expect(result).toEqual(payload);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('POST: Authorization-заголовок корректно закодирован в Base64', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { id: 'x' }));

    const client = new YookassaClient({ shopId: 'shop-42', secretKey: 'secret-key', maxRetries: 1 });
    await client.request({ method: 'POST', path: '/payments', body: { amount: 100 } });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    const expected = 'Basic ' + Buffer.from('shop-42:secret-key').toString('base64');
    expect(headers['Authorization']).toBe(expected);
  });

  it('POST без явного idempotenceKey: заголовок Idempotence-Key добавляется автоматически', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, {}));

    const client = new YookassaClient({ shopId: 'shop-1', secretKey: 'k', maxRetries: 1 });
    await client.request({ method: 'POST', path: '/payments', body: {} });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Idempotence-Key']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('POST с явным idempotenceKey: используется переданный ключ', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, {}));

    const client = new YookassaClient({ shopId: 'shop-1', secretKey: 'k', maxRetries: 1 });
    await client.request({
      method: 'POST',
      path: '/payments',
      body: {},
      idempotenceKey: 'my-custom-key',
    });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Idempotence-Key']).toBe('my-custom-key');
  });

  // ── 4xx: без повтора ────────────────────────────────────────────────────────

  it('4xx-ответ → YookassaValidationError, fetch вызван ровно 1 раз', async () => {
    mockFetch.mockResolvedValue(makeResponse(422, { type: 'validation_error' }));

    const client = new YookassaClient({ shopId: 'shop-1', secretKey: 'k', maxRetries: 3 });

    await expect(
      client.request({ method: 'POST', path: '/payments', body: {} }),
    ).rejects.toBeInstanceOf(YookassaValidationError);

    // 4xx — не ретраим
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('YookassaValidationError содержит statusCode из ответа', async () => {
    mockFetch.mockResolvedValue(makeResponse(400, { type: 'bad_request' }));

    const client = new YookassaClient({ shopId: 'shop-1', secretKey: 'k', maxRetries: 1 });

    const err = await client.request({ method: 'GET', path: '/payments' }).catch((e) => e);
    expect(err).toBeInstanceOf(YookassaValidationError);
    expect((err as YookassaValidationError).statusCode).toBe(400);
  });

  // ── 5xx: retry-логика ───────────────────────────────────────────────────────

  it('5xx всегда → retry 3 раза → YookassaNetworkError', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue(makeResponse(500, { type: 'server_error' }));

    const client = new YookassaClient({ shopId: 'shop-1', secretKey: 'k', maxRetries: 3 });

    // Используем .catch(e => e) чтобы избежать unhandled rejection пока прокручиваем таймеры
    const resultPromise = client.request({ method: 'GET', path: '/payments' }).catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await resultPromise;

    expect(err).toBeInstanceOf(YookassaNetworkError);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('5xx на первой попытке, 200 на второй → успешный результат', async () => {
    vi.useFakeTimers();
    const payload = { id: 'pay-ok' };
    mockFetch
      .mockResolvedValueOnce(makeResponse(503, {}))
      .mockResolvedValueOnce(makeResponse(200, payload));

    const client = new YookassaClient({ shopId: 'shop-1', secretKey: 'k', maxRetries: 3 });

    const promise = client.request<{ id: string }>({ method: 'GET', path: '/payments' });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual(payload);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('fetch бросает (сетевая ошибка) → ретраит → YookassaNetworkError', async () => {
    vi.useFakeTimers();
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const client = new YookassaClient({ shopId: 'shop-1', secretKey: 'k', maxRetries: 2 });

    const resultPromise = client.request({ method: 'GET', path: '/payments' }).catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await resultPromise;

    expect(err).toBeInstanceOf(YookassaNetworkError);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('maxRetries=1 → только одна попытка, без задержки, YookassaNetworkError', async () => {
    // maxRetries=1: нет задержки (attempt < maxRetries не выполняется) → fake timers не нужны
    mockFetch.mockResolvedValue(makeResponse(500, {}));

    const client = new YookassaClient({ shopId: 'shop-1', secretKey: 'k', maxRetries: 1 });

    const err = await client.request({ method: 'GET', path: '/payments' }).catch((e) => e);

    expect(err).toBeInstanceOf(YookassaNetworkError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// ─── getYookassaClient (singleton) ───────────────────────────────────────────

describe('getYookassaClient', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('выбрасывает ошибку если YOOKASSA_SHOP_ID не задан', async () => {
    vi.stubEnv('YOOKASSA_SHOP_ID', '');
    vi.stubEnv('YOOKASSA_SECRET_KEY', 'key');

    // Импортируем модуль заново чтобы сбросить singleton
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — query string bust cache, handled by Vitest
    const { getYookassaClient: getFresh } = await import('../client?bust=1');
    expect(() => getFresh()).toThrow(/не настроена/);
  });

  it('выбрасывает ошибку если YOOKASSA_SECRET_KEY не задан', async () => {
    vi.stubEnv('YOOKASSA_SHOP_ID', 'shop-id');
    vi.stubEnv('YOOKASSA_SECRET_KEY', '');

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — query string bust cache, handled by Vitest
    const { getYookassaClient: getFresh } = await import('../client?bust=2');
    expect(() => getFresh()).toThrow(/не настроена/);
  });

  it('singleton: два вызова с env-переменными возвращают один экземпляр', async () => {
    vi.stubEnv('YOOKASSA_SHOP_ID', 'shop-id');
    vi.stubEnv('YOOKASSA_SECRET_KEY', 'secret');

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — query string bust cache, handled by Vitest
    const { getYookassaClient: getFresh } = await import('../client?bust=3');
    const a = getFresh();
    const b = getFresh();
    expect(a).toBe(b);
  });
});
