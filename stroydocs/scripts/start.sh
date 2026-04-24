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
#   1. Запускаем migrate deploy, захватываем stdout+stderr в переменную.
#   2. Если успех — break.
#   3. Иначе извлекаем код ошибки Postgres:
#      • 42P07 (table already exists), 42701 (column already exists),
#        42710 (object/enum already exists), 42723 (function already exists)
#        — db push конфликт, безопасно пометить applied и продолжить.
#      • 42704 (type not found), 42P01 (relation not found), и другие
#        — РЕАЛЬНАЯ ошибка: миграция не выполнена, halt с явной диагностикой.
#        Не маскировать — это прямой путь к P2022 в рантайме.
#   4. На свежей БД все миграции применяются нормально.
echo '[migrate] Запуск миграций...'

attempt=0
max_attempts=120  # должен быть больше общего числа миграций (сейчас ~99)
MIGRATE_LOG=/tmp/migrate-deploy.log

while [ $attempt -lt $max_attempts ]; do
  if node node_modules/prisma/build/index.js migrate deploy >"$MIGRATE_LOG" 2>&1; then
    cat "$MIGRATE_LOG"
    echo '[migrate] Done.'
    break
  fi

  attempt=$((attempt + 1))

  # Показываем вывод migrate deploy всегда — чтобы в логах контейнера была
  # видна реальная ошибка Postgres (а не только обобщение start.sh).
  cat "$MIGRATE_LOG"

  # Извлекаем код ошибки из вывода Prisma: "Database error code: XXXXX"
  CODE=$(grep -oE 'Database error code: [0-9A-Z]+' "$MIGRATE_LOG" | head -1 | awk '{print $NF}')

  # Находим failed миграцию
  FAILED=$(node scripts/find-failed-migration.js 2>/dev/null) || {
    echo '[migrate] Критическая ошибка миграции (не удалось определить failed миграцию)'
    exit 1
  }

  case "$CODE" in
    42P07|42701|42710|42723)
      # Benign: объект уже существует (типичный случай для БД, частично
      # созданной через db push). Помечаем applied и продолжаем.
      echo "[migrate] Миграция $FAILED: объект уже существует (код $CODE, db push), помечаем applied..."
      node node_modules/prisma/build/index.js migrate resolve --applied "$FAILED" 2>/dev/null || true
      ;;
    *)
      # РЕАЛЬНАЯ ошибка (type/relation не существует, constraint violation и т.д.)
      # НЕ маскировать — это корёжит цепочку миграций и ведёт к P2022 в рантайме.
      echo '=================================================================='
      echo "[migrate] КРИТИЧЕСКАЯ ОШИБКА в миграции: $FAILED"
      echo "[migrate] Postgres error code: ${CODE:-unknown}"
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
