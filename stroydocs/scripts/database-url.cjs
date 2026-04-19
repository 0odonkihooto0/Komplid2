'use strict';

/**
 * CommonJS-копия src/lib/database-url.ts для server.js.
 * Логика и поведение должны совпадать — при изменении одной версии
 * синхронизировать вторую.
 */

function buildDatabaseUrl(connectionLimit, poolTimeout) {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error('[database-url] DATABASE_URL не задан');
  const timeout = typeof poolTimeout === 'number' ? poolTimeout : 20;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}connection_limit=${connectionLimit}&pool_timeout=${timeout}`;
}

const DEFAULT_APP_CONNECTION_LIMIT = Number(
  process.env.DATABASE_CONNECTION_LIMIT || 5
);

const SOCKET_CONNECTION_LIMIT = Number(
  process.env.SOCKET_DATABASE_CONNECTION_LIMIT || 2
);

const WORKER_CONNECTION_LIMIT = Number(
  process.env.WORKER_DATABASE_CONNECTION_LIMIT || 2
);

module.exports = {
  buildDatabaseUrl,
  DEFAULT_APP_CONNECTION_LIMIT,
  SOCKET_CONNECTION_LIMIT,
  WORKER_CONNECTION_LIMIT,
};
