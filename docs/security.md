# security.md — Безопасность и надёжность

Этот раздел описывает реализованные меры безопасности и паттерны, которые **обязательно соблюдать** при разработке новых модулей.

## 1. Error Boundaries (изолируем краши компонентов)

**Статус:** ✅ Реализовано

`<ErrorBoundary>` добавлен в `src/app/layout.tsx` (глобально) и `src/app/(dashboard)/layout.tsx` (внутри `<main>`). Краш отдельного компонента не убивает всю страницу.

Компонент: `src/components/shared/ErrorBoundary.tsx` — кастомный class-based (React не поддерживает function component boundaries).

Правило: при добавлении новых сложных секций страницы (таблицы, графики, виджеты) оборачивать в `<ErrorBoundary>` для изоляции.

## 2. Health Check эндпоинт

**Статус:** ✅ Реализовано (`GET /api/health`)

Возвращает `{ status, db, redis }`. HTTP 200 если БД доступна, 503 если нет. Используется Timeweb App Platform для мониторинга и принятия решения о перезапуске контейнера. Не требует аутентификации — это нормально для health check.

## 3. Сессии с ограниченным сроком жизни

**Статус:** ✅ Реализовано

В `src/lib/auth.ts`:
```typescript
session: {
  strategy: 'jwt',
  maxAge: 24 * 60 * 60,   // 24 часа — снижает риск при компрометации токена
  updateAge: 60 * 60,     // Обновлять токен каждый час активной сессии
}
```
**Не менять на более длинный срок без осознанного решения.** По умолчанию NextAuth сессии бессрочные — это риск при компрометации токена.

## 4. Connection Pooling БД

**Статус:** ✅ Реализовано

В `src/lib/db.ts` Prisma singleton с `connection_limit=10&pool_timeout=20` в DATABASE_URL.

При горизонтальном масштабировании (несколько воркеров/инстансов) **обязательно** настроить PgBouncer в Timeweb Managed PostgreSQL:
- Режим: Transaction pooling
- max_client_conn: 200, default_pool_size: 10 на базу
- Изменить DATABASE_URL на endpoint PgBouncer, а не прямой PostgreSQL

Без PgBouncer при нескольких воркерах соединений не хватит → краш под нагрузкой.

## 5. Защита admin-роутов

**Статус:** ✅ Проверено

- `GET /api/organizations` — проверяет `session.user.role !== 'ADMIN'`
- `POST /api/admin/setup-s3` — Bearer токен (`ADMIN_SECRET` или `NEXTAUTH_SECRET`)

**Правило для новых admin-роутов:** каждый API-роут с "admin" в пути или с административными действиями **обязан** начинаться с:
```typescript
const session = await getSessionOrThrow();
if (session.user.role !== 'ADMIN') return errorResponse('Недостаточно прав', 403);
```

## 6. CORS политика

**Статус:** ✅ Реализовано

В `next.config.mjs` явный `Access-Control-Allow-Origin: process.env.APP_URL`. Next.js по умолчанию разрешает запросы с любого origin — без явного заголовка браузеры всё равно блокируют cross-origin, но серверный код (curl и т.п.) нет.

`APP_URL` должен быть задан в env (`https://app.stroydocs.ru` для прод).

## 7. Валидация env-переменных при старте

**Статус:** ✅ Реализовано

`src/lib/env.ts` — проверяет все обязательные переменные при старте сервера. Импортируется в `src/lib/db.ts` (первый файл, который загружается).

При отсутствии обязательной переменной приложение падает с явным сообщением `[env] Отсутствуют обязательные переменные окружения: DATABASE_URL`, а не тихо ломается в рандомном месте.

При добавлении новых обязательных переменных — добавлять в массив `REQUIRED_ENV_VARS` в `src/lib/env.ts`.

## 8. Токены приглашений и срок истечения

**Статус:** ✅ Реализовано корректно

Модель `Invitation` имеет поле `expiresAt`. В `POST /api/invitations` устанавливается 7 дней. В `POST /api/invitations/accept` явная проверка:
```typescript
if (new Date() > invitation.expiresAt) // → 410 Gone
```
Если в будущем появится password reset — токен сброса **должен** истекать через 1 час (не 7 дней). Хранить в отдельной таблице `PasswordResetToken(token, userId, expiresAt, usedAt)`.

## 9. Пагинация запросов к БД

**Статус:** ✅ Частично реализовано (критичные роуты исправлены)

Три наиболее опасных роута получили обязательную пагинацию (`take`/`skip`):
- `GET /api/.../work-records` — лимит 50 по умолчанию, макс 200
- `GET /api/.../materials` — лимит 50 по умолчанию, макс 200
- `GET /api/.../execution-docs` — лимит 50 по умолчанию, макс 200

Все три возвращают `{ data, total, page, limit }`.

**Правило:** любой новый `findMany` на моделях `WorkRecord`, `Material`, `ExecutionDoc`, `Ks2Act`, `Photo`, `Defect` **обязан** иметь `take` и `skip`. Без пагинации при 1000+ записей — OOM краш или таймаут.

## 10. Индексы в БД

**Статус:** ✅ Добавлены критичные индексы

Добавлены в `prisma/schema.prisma`:
- `WorkRecord`: `@@index([date])` — сортировка по дате во всех списках
- `ExecutionDoc`: `@@index([status])` — фильтрация по статусу (черновик/подписан/отклонён)

Существующие индексы: `contractId`, `organizationId`, `workItemId`, `entityType+entityId` (фото).

При добавлении новых часто-фильтруемых полей — **обязательно** добавлять `@@index` и выполнять `npx prisma migrate dev`.
