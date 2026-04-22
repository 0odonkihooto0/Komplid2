# deployment.md — Известные проблемы деплоя

## Известные проблемы деплоя Timeweb App Platform

* **`port is already allocated` (порт 3000 занят)**: возникает если предыдущий неудачный деплой не освободил ресурсы. Причина — Timeweb App Platform не всегда корректно убивает старые контейнеры при ошибке деплоя.
  * **Правильное решение**: в панели Timeweb App Platform вручную остановить/удалить предыдущий деплой → повторить деплой. Если не помогло — обратиться в поддержку Timeweb для принудительного освобождения порта на хосте. Код приложения не трогать.
  * ⚠️ **НЕ делать**: поддержка Timeweb может посоветовать изменить маппинг портов в `docker-compose.yml` (например, `"3001:3000"`). **Это неверно для нашего случая** — изменение внешнего порта сломает `NEXTAUTH_URL`, `APP_URL`, CORS-заголовок и health check Timeweb, которые жёстко прописаны на `:3000`. Порт во всех этих местах менять нельзя без полного аудита конфигурации.

* **`P3009: migrate found failed migrations` — блокировка очереди миграций**: Prisma помечает миграцию как `failed` при обрыве контейнера/сети во время её выполнения. Все последующие миграции блокируются. Симптом: в логах `new migrations will not be applied`, затем `db push` падает с FK-ошибкой, но приложение всё равно стартует — с рассинхронизированной схемой (таблицы/колонки отсутствуют → 500 ошибки в рантайме).
  * **Правильное решение**: в `Dockerfile` CMD добавить `prisma migrate resolve --rolled-back <migration_name>` **перед** `migrate deploy`. Это снимает метку `failed` и позволяет очереди продолжиться. Пример уже реализован в текущем `Dockerfile`.
  * ⚠️ **НЕ делать**: не использовать `db push --accept-data-loss` как fallback в продакшне — эта команда может удалять колонки с данными. Не запускать `exec node server.js` безусловно (т.е. через `;` или после `|| echo`) — приложение не должно стартовать при провале миграций.

* **`P3018: enum label already exists` / "already exists"** при `migrate deploy` после `db push`: если ранее запускался `db push --accept-data-loss`, он применил все схемные изменения напрямую в БД, **не записав** их в `_prisma_migrations`. При следующем `migrate deploy` Prisma пытается применить те же миграции снова → цепочка ошибок "already exists".
  * **Правильное решение** (текущая реализация): `scripts/start.sh` запускает `migrate deploy` в цикле. При ошибке "already exists" — находит failed миграцию через `scripts/find-failed-migration.js`, помечает как `--applied` и повторяет. Этот цикл автоматически обрабатывает все таблицы, ранее созданные через `db push`.
  * ⚠️ **НЕ использовать статический список `--applied`**: старый подход (перечисление всех миграций в `for m in ...`) ломался при сбросе/пересоздании БД — все миграции помечались как applied без фактического выполнения SQL, таблицы не создавались.

* **Crash loop / P2021 "table does not exist" после деплоя** — `_prisma_migrations` содержит записи (от старого start.sh с `--applied`), но таблицы не были фактически созданы. `migrate deploy` видит "No pending migrations" и не создаёт таблицы.
  * **Правильное решение** (текущая реализация): `scripts/check-migration-integrity.js` проверяет наличие ключевых таблиц при старте. Если таблицы отсутствуют, а `_prisma_migrations` содержит записи — очищает `_prisma_migrations` (TRUNCATE). Затем `migrate deploy` применяет миграции заново.
  * ⚠️ **При добавлении новых миграций**: ничего дополнительно делать не нужно. `migrate deploy` применит их автоматически. НЕ добавлять в какие-либо списки.

* **`Failed to find Server Action` после деплоя** — у пользователей с открытыми вкладками устаревают Server Action ID. Решение реализовано: `src/app/error.tsx` и `src/app/global-error.tsx` содержат `useEffect` с `window.location.reload()` при обнаружении этой ошибки. При создании новых error boundary — использовать тот же паттерн.

* **`/bin/sh: git: not found` в логах Docker build (builder stage)** — `generateBuildId` в `next.config.mjs` вызывает `git rev-parse HEAD`. Решение: `git` уже добавлен в `apk add` Stage 2 builder (`stroydocs/Dockerfile` строка 15). Примечание: `.dockerignore` исключает `.git` из build context, поэтому `generateBuildId` всё равно падает в catch и возвращает `build-${Date.now()}` — это нормально, build ID остаётся уникальным.

* **Предупреждения docker-compose** `variable is not set` для `YANDEX_*` переменных — некритичны, деплой продолжается. YandexGPT недоступен, но приложение запустится (смета-парсинг работает в деградированном режиме через Gemini fallback).

* **Предупреждение webpack** `require.extensions is not supported` из handlebars — некритично, сборка завершается успешно. Это известное ограничение webpack 5 при бандлинге Handlebars в Next.js API Routes. Не исправлять — производительности не влияет.

* **`next/font` error: Failed to fetch Inter/JetBrains Mono from Google Fonts** — Docker build завершается с `webpack errors` потому что `npm run build` пытается скачать шрифты из Google Fonts, но Docker-окружение не имеет доступа в интернет во время сборки.
  * **Причина**: `next/font/google` скачивает шрифты в фазе webpack-компиляции (`npm run build`), а не при `npm install`. В Docker BuildKit исходящие соединения обрезаны или Google заблокирован.
  * **Решение** (реализовано): шрифты переведены на `next/font/local`. Файлы woff2 берутся из npm-пакетов `@fontsource-variable/inter` и `@fontsource/jetbrains-mono`, установленных в `npm install`. Скрипт `scripts/copy-fonts.mjs` копирует их в `public/fonts/` и запускается автоматически через `"prebuild"` в `package.json` — до `npm run build`.
  * **Изменённые файлы**: `src/app/layout.tsx` (import → `next/font/local`), `package.json` (добавлен `prebuild`), `scripts/copy-fonts.mjs` (новый).
  * ⚠️ **НЕ делать**: не возвращаться на `next/font/google` — это нарушает требования ФЗ-152 (запросы к зарубежным CDN) и ломает Docker-сборку в изолированных окружениях. Не добавлять шрифты в git-репозиторий напрямую — они генерируются из npm-пакетов автоматически.
