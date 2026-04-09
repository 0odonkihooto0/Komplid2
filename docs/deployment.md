# deployment.md — Известные проблемы деплоя

## Известные проблемы деплоя Timeweb App Platform

* **`port is already allocated` (порт 3000 занят)**: возникает если предыдущий неудачный деплой не освободил ресурсы. Причина — Timeweb App Platform не всегда корректно убивает старые контейнеры при ошибке деплоя.
  * **Правильное решение**: в панели Timeweb App Platform вручную остановить/удалить предыдущий деплой → повторить деплой. Если не помогло — обратиться в поддержку Timeweb для принудительного освобождения порта на хосте. Код приложения не трогать.
  * ⚠️ **НЕ делать**: поддержка Timeweb может посоветовать изменить маппинг портов в `docker-compose.yml` (например, `"3001:3000"`). **Это неверно для нашего случая** — изменение внешнего порта сломает `NEXTAUTH_URL`, `APP_URL`, CORS-заголовок и health check Timeweb, которые жёстко прописаны на `:3000`. Порт во всех этих местах менять нельзя без полного аудита конфигурации.

* **`P3009: migrate found failed migrations` — блокировка очереди миграций**: Prisma помечает миграцию как `failed` при обрыве контейнера/сети во время её выполнения. Все последующие миграции блокируются. Симптом: в логах `new migrations will not be applied`, затем `db push` падает с FK-ошибкой, но приложение всё равно стартует — с рассинхронизированной схемой (таблицы/колонки отсутствуют → 500 ошибки в рантайме).
  * **Правильное решение**: в `Dockerfile` CMD добавить `prisma migrate resolve --rolled-back <migration_name>` **перед** `migrate deploy`. Это снимает метку `failed` и позволяет очереди продолжиться. Пример уже реализован в текущем `Dockerfile`.
  * ⚠️ **НЕ делать**: не использовать `db push --accept-data-loss` как fallback в продакшне — эта команда может удалять колонки с данными. Не запускать `exec node server.js` безусловно (т.е. через `;` или после `|| echo`) — приложение не должно стартовать при провале миграций.

* **`P3018: enum label already exists` / "already exists"** при `migrate deploy` после `db push`: если ранее запускался `db push --accept-data-loss`, он применил все схемные изменения напрямую в БД, **не записав** их в `_prisma_migrations`. При следующем `migrate deploy` Prisma пытается применить те же миграции снова → цепочка ошибок "already exists".
  * **Правильное решение**: пометить все такие миграции как `--applied` через `migrate resolve --applied <name>` в Dockerfile CMD (перед `migrate deploy`). Они уже в БД — нужно только зарегистрировать их в истории.
  * ⚠️ **Не смешивать `--rolled-back` и `--applied`**: `--rolled-back` = "миграция прервалась, перезапустить"; `--applied` = "миграция уже выполнена через db push, только записать в историю".

* **Crash loop: контейнер перезапускается в цикле, в логах многократно "Prisma schema loaded from prisma/schema.prisma"** — причина: `scripts/start.sh` не перечислил все миграции в списке `--applied`, `migrate deploy` пытается применить уже существующие таблицы → ошибка "already exists" → `set -e` → скрипт падает → Timeweb перезапускает → loop.
  * **Правильное решение**: убедиться что в `scripts/start.sh` в списке `for m in \` перечислены ВСЕ директории из `prisma/migrations/` (кроме `migration_lock.toml`). При добавлении каждой новой миграции — сразу добавлять её в этот список.
  * ⚠️ **Не путать с `--rolled-back`**: новые миграции, применённые через `db push` или `migrate deploy`, добавлять как `--applied`. Только прерванные/незавершённые миграции — как `--rolled-back`.

* **`Failed to find Server Action` после деплоя** — у пользователей с открытыми вкладками устаревают Server Action ID. Решение реализовано: `src/app/error.tsx` и `src/app/global-error.tsx` содержат `useEffect` с `window.location.reload()` при обнаружении этой ошибки. При создании новых error boundary — использовать тот же паттерн.

* **`/bin/sh: git: not found` в логах Docker build (builder stage)** — `generateBuildId` в `next.config.mjs` вызывает `git rev-parse HEAD`. Решение: `git` уже добавлен в `apk add` Stage 2 builder (`stroydocs/Dockerfile` строка 15). Примечание: `.dockerignore` исключает `.git` из build context, поэтому `generateBuildId` всё равно падает в catch и возвращает `build-${Date.now()}` — это нормально, build ID остаётся уникальным.

* **Предупреждения docker-compose** `variable is not set` для `YANDEX_*` переменных — некритичны, деплой продолжается. YandexGPT недоступен, но приложение запустится (смета-парсинг работает в деградированном режиме через Gemini fallback).

* **Предупреждение webpack** `require.extensions is not supported` из handlebars — некритично, сборка завершается успешно. Это известное ограничение webpack 5 при бандлинге Handlebars в Next.js API Routes. Не исправлять — производительности не влияет.
