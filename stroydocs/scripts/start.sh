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

# ── Быстрая разметка уже-существующих миграций ───────────────────────────────
# Помечает в _prisma_migrations все миграции, чьи объекты уже существуют в БД
# (созданы через db push). Сокращает число итераций цикла с ~80 до ~15-20,
# что позволяет уложиться в лимит health check контейнера.
echo '[migrate] Быстрая разметка устаревших миграций...'
node scripts/bulk-mark-stale-migrations.js || true

# ── Применение миграций ──────────────────────────────────────────────────────
# Стратегия:
#   1. Запускаем migrate deploy, захватываем stdout+stderr в файл.
#   2. Если успех — break.
#   3. Иначе классифицируем ошибку:
#      a) Транзиентные сетевые ошибки Prisma (P1001, P1008, P1017) —
#         БД недоступна/таймаут/соединение оборвано. Это НЕ сбой миграции.
#         Ретрай с экспоненциальным backoff (2s, 4s, 8s, 16s, cap 30s).
#      b) Benign SQL (42P07/42701/42710/42723 — already exists) —
#         db push конфликт, помечаем applied и продолжаем.
#      c) Блокирующие SQL (42704 type not found, 42P01 relation not found,
#         прочие) — РЕАЛЬНАЯ ошибка миграции. Halt с явной диагностикой.
#   4. На свежей БД все миграции применяются нормально.
echo '[migrate] Запуск миграций...'

attempt=0
transient_attempts=0
max_attempts=120  # должен быть больше общего числа миграций (сейчас ~99)
max_transient=6   # ретраев на транзиентную ошибку БД (суммарно ~62s с backoff)
MIGRATE_LOG=/tmp/migrate-deploy.log

while [ $attempt -lt $max_attempts ]; do
  if node node_modules/prisma/build/index.js migrate deploy >"$MIGRATE_LOG" 2>&1; then
    cat "$MIGRATE_LOG"
    echo '[migrate] Done.'
    break
  fi

  # Показываем вывод migrate deploy всегда — чтобы в логах контейнера была
  # видна реальная ошибка Postgres (а не только обобщение start.sh).
  cat "$MIGRATE_LOG"

  # Извлекаем коды ошибок
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

  # С этого момента считаем попытку настоящей (не транзиентной)
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
      # (b) Benign: объект уже существует (типичный случай для БД, частично
      # созданной через db push). Помечаем applied и продолжаем.
      echo "[migrate] Миграция $FAILED: объект уже существует (код $PG_CODE, db push), помечаем applied..."
      node node_modules/prisma/build/index.js migrate resolve --applied "$FAILED" 2>/dev/null || true
      ;;
    *)
      # (c) РЕАЛЬНАЯ ошибка (type/relation не существует, constraint violation и т.д.)
      # НЕ маскировать — это корёжит цепочку миграций и ведёт к P2022 в рантайме.
      echo '=================================================================='
      echo "[migrate] КРИТИЧЕСКАЯ ОШИБКА в миграции: $FAILED"
      echo "[migrate] Postgres error code: ${PG_CODE:-unknown}"
      echo "[migrate] Prisma error code:   ${PRISMA_CODE:-unknown}"
      echo '[migrate] Это НЕ «таблица уже существует» — миграция НЕ выполнена.'
      echo '[migrate] Помечать --applied запрещено (маскирует сбой).'
      echo '[migrate] Диагностика: проверить SQL миграции и предшествующие'
      echo '[migrate]   миграции на предмет зависимостей (типы/таблицы).'
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

  # convert-ifc воркер: слушает очередь "convert-ifc", дергает ifc-service /convert
  # и сохраняет glbS3Key в BimModel.metadata. Без него модели висят в CONVERTING.
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
