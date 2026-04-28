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
echo '[migrate] Запуск миграций...'

attempt=0
transient_attempts=0
max_attempts=10
max_transient=6   # ретраев на транзиентную ошибку БД (суммарно ~62s с backoff)
MIGRATE_LOG=/tmp/migrate-deploy.log

while [ $attempt -lt $max_attempts ]; do
  if node node_modules/prisma/build/index.js migrate deploy >"$MIGRATE_LOG" 2>&1; then
    cat "$MIGRATE_LOG"
    echo '[migrate] Done.'
    break
  fi

  cat "$MIGRATE_LOG"

  PG_CODE=$(grep -oE 'Database error code: [0-9A-Z]+' "$MIGRATE_LOG" | head -1 | awk '{print $NF}')
  PRISMA_CODE=$(grep -oE 'P1[0-9]{3}' "$MIGRATE_LOG" | head -1)

  # (a) Транзиентные сетевые ошибки БД — ретрай без изменения _prisma_migrations
  case "$PRISMA_CODE" in
    P1001|P1008|P1017)
      transient_attempts=$((transient_attempts + 1))
      if [ $transient_attempts -gt $max_transient ]; then
        echo '=================================================================='
        echo "[migrate] БД недоступна после $max_transient попыток (код $PRISMA_CODE)"
        echo '[migrate] Возможна долгая недоступность Timeweb Managed PostgreSQL.'
        echo '=================================================================='
        exit 1
      fi
      WAIT=$((transient_attempts * 2))
      [ $WAIT -gt 30 ] && WAIT=30
      echo "[migrate] Транзиентная ошибка БД ($PRISMA_CODE), попытка $transient_attempts/$max_transient — ретрай через ${WAIT}s..."
      sleep $WAIT
      continue
      ;;
  esac

  attempt=$((attempt + 1))

  # Находим failed миграцию. Если find-failed-migration.js упал — это тоже
  # обычно транзиент БД (запрос к _prisma_migrations). Не halt — ретрай.
  FAILED=$(node scripts/find-failed-migration.js 2>/dev/null) || {
    transient_attempts=$((transient_attempts + 1))
    if [ $transient_attempts -gt $max_transient ]; then
      echo '[migrate] Не удаётся определить failed миграцию — БД недоступна.'
      exit 1
    fi
    WAIT=$((transient_attempts * 2))
    [ $WAIT -gt 30 ] && WAIT=30
    echo "[migrate] find-failed-migration.js не смог подключиться к БД — ретрай через ${WAIT}s..."
    sleep $WAIT
    continue
  }

  case "$PG_CODE" in
    42P07|42701|42710|42723)
      # Benign: объект уже существует. На чистой БД не должно возникать.
      echo "[migrate] Миграция $FAILED: объект уже существует (код $PG_CODE), помечаем applied..."
      node node_modules/prisma/build/index.js migrate resolve --applied "$FAILED" 2>/dev/null || true
      ;;
    *)
      echo '=================================================================='
      echo "[migrate] КРИТИЧЕСКАЯ ОШИБКА в миграции: $FAILED"
      echo "[migrate] Postgres error code: ${PG_CODE:-unknown}"
      echo "[migrate] Prisma error code:   ${PRISMA_CODE:-unknown}"
      echo '[migrate] Это НЕ «таблица уже существует» — миграция НЕ выполнена.'
      echo '[migrate] Помечать --applied запрещено (маскирует сбой).'
      echo '=================================================================='
      exit 1
      ;;
  esac
done

if [ $attempt -ge $max_attempts ]; then
  echo '[migrate] Превышено количество попыток миграции'
  exit 1
fi

rm -f "$MIGRATE_LOG"

# ── Запуск BIM-воркера (только если Redis доступен) ──────────────────────────
REDIS_OK=$(node -e "
const url = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
const net = require('net');
const s = net.createConnection(Number(url.port) || 6379, url.hostname);
s.on('connect', () => { s.destroy(); console.log('ok'); process.exit(0); });
s.on('error', () => { s.destroy(); console.log('no'); process.exit(0); });
setTimeout(() => { s.destroy(); console.log('no'); process.exit(0); }, 3000);
" 2>/dev/null || echo 'no')

if [ "$REDIS_OK" = "ok" ]; then
  echo '[worker] Redis доступен. Запуск parse-ifc worker...'
  node /app/dist/workers/lib/workers/parse-ifc.worker.js &
  WORKER_PID=$!
  echo '[worker] parse-ifc worker запущен (PID: '"$WORKER_PID"')'

  if [ -f /app/dist/workers/lib/workers/convert-ifc.worker.js ]; then
    echo '[worker] Запуск convert-ifc worker...'
    node /app/dist/workers/lib/workers/convert-ifc.worker.js &
    CONVERT_WORKER_PID=$!
    echo '[worker] convert-ifc worker запущен (PID: '"$CONVERT_WORKER_PID"')'
  else
    echo '[worker] ВНИМАНИЕ: convert-ifc.worker.js не найден в dist/, сборка воркеров неполная.'
  fi
else
  echo '[worker] Redis недоступен ('"$REDIS_URL"'). Воркеры НЕ запущены.'
fi

exec node server.js
