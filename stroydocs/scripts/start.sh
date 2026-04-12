#!/bin/sh
set -e

# ── Ожидание подключения к БД ────────────────────────────────────────────────
echo '[migrate] Ожидание подключения к БД...'
node -e "
const url = new URL(process.env.DATABASE_URL || '');
const net = require('net');
let retries = 30;
const tryConnect = () => {
  const s = net.createConnection(parseInt(url.port) || 5432, url.hostname);
  s.on('connect', () => { s.destroy(); console.log('[migrate] Database ready.'); process.exit(0); });
  s.on('error', () => {
    s.destroy();
    if (--retries <= 0) { console.error('[migrate] ERROR: Database unreachable after 60s'); process.exit(1); }
    console.log('[migrate] Not ready, ' + retries + ' retries left, waiting 2s...');
    setTimeout(tryConnect, 2000);
  });
};
tryConnect();
"

# ── Проверка целостности _prisma_migrations ──────────────────────────────────
# Если миграции помечены как applied (из старого start.sh), но таблицы
# отсутствуют — очищаем _prisma_migrations для повторного применения.
echo '[migrate] Проверка целостности...'
node scripts/check-migration-integrity.js || true

# ── Применение миграций ──────────────────────────────────────────────────────
# Стратегия:
#   1. Запускаем migrate deploy
#   2. Если миграция падает (таблица уже существует из db push) —
#      помечаем как applied и повторяем
#   3. На свежей БД все миграции применяются
#   4. На существующей БД уже созданные таблицы пропускаются
echo '[migrate] Запуск миграций...'

attempt=0
max_attempts=55
while [ $attempt -lt $max_attempts ]; do
  if node node_modules/prisma/build/index.js migrate deploy 2>&1; then
    echo '[migrate] Done.'
    break
  fi

  attempt=$((attempt + 1))

  # Находим failed миграцию
  FAILED=$(node scripts/find-failed-migration.js 2>/dev/null) || {
    echo '[migrate] Критическая ошибка миграции (не удалось определить failed миграцию)'
    exit 1
  }

  echo "[migrate] Миграция $FAILED: таблица уже существует (db push), помечаем as applied..."
  node node_modules/prisma/build/index.js migrate resolve --applied "$FAILED" 2>/dev/null || true
done

if [ $attempt -ge $max_attempts ]; then
  echo '[migrate] Превышено количество попыток миграции'
  exit 1
fi

# ── Запуск BIM-воркера ───────────────────────────────────────────────────────
echo '[worker] Запуск parse-ifc worker...'
node /app/dist/workers/lib/workers/parse-ifc.worker.js &
WORKER_PID=$!
echo '[worker] parse-ifc worker запущен (PID: '"$WORKER_PID"')'

exec node server.js
