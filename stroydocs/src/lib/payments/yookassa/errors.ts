// Классы ошибок ЮKassa. Импортируются клиентом и вызывающим кодом.

/** Базовая ошибка ЮKassa. Содержит raw-ответ для диагностики. */
export class YookassaError extends Error {
  readonly response: unknown;

  constructor(message: string, response: unknown) {
    super(message);
    this.name = 'YookassaError';
    this.response = response;
    // Восстанавливаем прототип для instanceof-проверок в TypeScript
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Ошибка валидации (HTTP 4xx от ЮKassa).
 * Не требует повтора — запрос сформирован неверно.
 */
export class YookassaValidationError extends YookassaError {
  readonly statusCode: number;

  constructor(statusCode: number, response: unknown) {
    super(`ЮKassa вернула ${statusCode}`, response);
    this.name = 'YookassaValidationError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Сетевая ошибка или исчерпание попыток повтора.
 * Возникает при 5xx, таймауте или недоступности ЮKassa.
 */
export class YookassaNetworkError extends YookassaError {
  readonly cause: Error | null;

  constructor(message: string, cause: Error | null) {
    super(message, null);
    this.name = 'YookassaNetworkError';
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
