# lessons.md — Накопленные уроки

> Обновлять после каждой исправленной ошибки. Этот файл — живой.
> Формат: **Что случилось** → **Почему** → **Правило на будущее**

**`as const` на массиве объектов с опциональным свойством — `Property 'exact' does not exist` при доступе через union-тип.**
`ProfileTabs.tsx` объявлял `const TABS = [...] as const` где первый объект имел `exact: true`, а остальные — нет. TypeScript выводил тип массива как union литерального типа: `{ href: '/profile'; label: 'Общее'; exact: true } | { href: '/profile/security'; label: 'Безопасность' } | ...`. При обращении `tab.exact` TypeScript ругался: `Property 'exact' does not exist on type '{ href: "/profile/security"; ... }'` — потому что у остальных объектов в union свойства `exact` нет.
Ошибка проявляется только на `next build` (type-check фаза) — локально без `node_modules` молчит.
**Исправление**: заменить `as const` на явную типизацию массива: `const TABS: { href: string; label: string; exact?: boolean }[] = [...]`. Это:
1. Делает `exact` опциональным полем (тип `boolean | undefined`) на каждом элементе
2. Ломает мономорфизм литеральных типов (больше нельзя использовать `tab.href` как `RouteType`), но для навигационных массивов это не нужно
**Правило**: `as const` на массивах объектов безопасен только если все объекты имеют **одинаковый набор ключей**. Если хотя бы один объект имеет уникальное свойство (например, `exact: true`, `badge: 'New'`, `icon: SomeIcon`), которого нет у других — использовать явную типизацию `Array<{ field?: T }>` вместо `as const`. Поиск потенциальных нарушений: найти `as const` на массивах объектов и проверить что набор ключей одинаков у всех элементов.

**`receipt` в `db.payment.create({ data: {...} })` — путаница между JSON-полем для API и relation в Prisma.**
`dunning-service.ts` передавал `receipt: buildSubscriptionReceipt(...)` в `data` при `db.payment.create()`. Ошибка: в модели `Payment` поле `receipt` — это **relation** к модели `Receipt` (не JSON-поле), поэтому Prisma при разрешении union-типа (`PaymentCreateInput | PaymentUncheckedCreateInput`) требовал `receipt?: undefined` в unchecked-форме. TypeScript TS2322 при деплое: `'InputJsonValue | undefined' is not assignable to type 'undefined'`.
`buildSubscriptionReceipt()` возвращает объект `YookassaReceiptData` — это данные для API ЮKassa при создании платежа (54-ФЗ чек), а не запись в БД.
**Правило**: `buildSubscriptionReceipt()` передаётся **только** в параметры функций ЮKassa API (`createYooPayment`, `chargeRecurring`), никогда не в `db.payment.create({ data: ... })`. Relation `receipt` в `data` может только указывать на существующую запись через `{ connect: { id: receiptId } }` или не устанавливаться вовсе. Быстрая проверка: `grep -rn "receipt.*buildSubscription\|buildSubscription.*receipt" src/ | grep "db\."` — не должно быть совпадений.

---

## Prisma / База данных

**`max_attempts=55` в start.sh меньше общего числа миграций → P2022 на поздних миграциях.**
Симптом: `PrismaClientKnownRequestError P2022: The column 'building_objects.workspaceId' does not exist` при каждом запросе, хотя миграция `20260421060000_add_workspace_missing_columns` существует в репозитории. Причина: при наличии >55 «already exists» ошибок (БД частично создана через `db push`) цикл в `start.sh` вычерпывал `max_attempts=55` на первых 55 миграциях и завершался — не добравшись до миграции #93. `find-failed-migration.js` успевал пометить миграцию #93 как `--applied` через `migrate resolve` без фактического выполнения SQL (`ADD COLUMN`). На следующем деплое `migrate deploy` видел #93 как applied и пропускал его.
**Исправление**: (1) `max_attempts` увеличен до 120 (должен быть > общего числа миграций в проекте); (2) создана аварийная миграция `20260422000000_fix_missing_workspace_column` с идемпотентным `ADD COLUMN IF NOT EXISTS` — она гарантированно выполнится как новая (#95), даже если #93 помечена applied без выполнения; (3) в `check-migration-integrity.js` добавлены `workspaces` и `subscription_plans` в `KEY_TABLES` — при их отсутствии очищается `_prisma_migrations` для полного повтора.
**Правило**: `max_attempts` в `start.sh` **ОБЯЗАН** быть больше общего числа миграций в `prisma/migrations/`. При добавлении крупного блока миграций (>5 за один PR) — проверить: `ls prisma/migrations/ | grep -v lock | wc -l` и сравнить с `max_attempts`. Если разрыв < 20 — увеличить `max_attempts`. Быстрая проверка: `grep max_attempts scripts/start.sh && ls prisma/migrations/ | grep -v lock | wc -l`.
Дополнительно: `check-migration-integrity.js` должен включать таблицы из ПОЗДНИХ миграций (не только из начальных) — иначе проверка всегда проходит даже при полностью пропущенных поздних миграциях.

**P2037 `Too many database connections` / `remaining connection slots are reserved for roles with the SUPERUSER attribute` — две независимые причины в одном баге.**

Продакшн-логи показывали массовый P2037 на всех роутах (`/api/task-labels`, `/api/objects`, `/api/task-groups`, `/api/task-types`, `/api/tasks`, `/api/objects/[id]/summary`, `passport/widgets`, `dashboard-indicators`). PostgreSQL отдавал `FATAL: sorry, too many clients already` и `FATAL: remaining connection slots are reserved for roles with the SUPERUSER attribute` — слоты БД выгреблены самим приложением.

**Причина 1 — наивная склейка `DATABASE_URL + '?connection_limit=10&pool_timeout=20'` ломает URL при любой существующей query-строке.**
Typical Timeweb Managed PostgreSQL URL: `postgresql://user:pass@host/db?sslmode=require`. После `+ '?...'` получается `...?sslmode=require?connection_limit=10&pool_timeout=20`. По спецификации URI всё после ПЕРВОГО `?` — одна query-строка: `sslmode=require?connection_limit=10&pool_timeout=20`. PostgreSQL/Prisma читают `sslmode` со значением `require?connection_limit=10` (мусор, но может быть проигнорирован), а `connection_limit` они **не видят** вообще. Prisma применяет дефолт `num_physical_cpus * 2 + 1` — на 8-ядерном VPS это 17 соединений на один `PrismaClient`.

**Причина 2 — второй `PrismaClient` в `server.js` без лимита.**
Продакшн-контейнер запускает `node server.js`, который встраивает Socket.io для чата. `server.js` создавал собственный `new PrismaClient()` (без URL-параметров) для сохранения сообщений — это **второй** пул в том же Node-процессе, независимый от синглтона `src/lib/db.ts`. Плюс дефолтный размер пула = ещё +17 соединений. Итого на одном VPS: `17 (Next.js) + 17 (Socket.io) = 34` соединения от одного контейнера. `max_connections=100` у Timeweb Managed PostgreSQL с ~3 reserved — при любом всплеске нагрузки (одновременные запросы на dashboard + чат) слоты кончаются.

**Решение**:
1. `src/lib/database-url.ts` — helper `buildDatabaseUrl(limit, timeout=20)`, корректно выбирает `?` или `&` в зависимости от наличия query-строки. Экспортирует `DEFAULT_APP_CONNECTION_LIMIT=5` (Next.js), `SOCKET_CONNECTION_LIMIT=2` (server.js), `WORKER_CONNECTION_LIMIT=2` (BullMQ воркеры). Все лимиты переопределяемы через env.
2. `scripts/database-url.cjs` — CommonJS-копия для `server.js` (CJS-entry, не может импортировать TS). Обязательно копировать в Docker-образ (`COPY scripts/database-url.cjs ./scripts/`).
3. `src/lib/db.ts`, `server.js`, `src/server/socket.ts`, все `src/lib/workers/*.worker.ts` — используют `buildDatabaseUrl()` с соответствующим лимитом.

**Правило на будущее**:
- **Никогда не делать `process.env.DATABASE_URL + '?param=value'`.** Использовать `buildDatabaseUrl()` — он умеет различать `?` vs `&`. Поиск нарушений: `grep -r "DATABASE_URL.*+.*\?" src/`.
- **Никогда не создавать `new PrismaClient()` без явного `datasources.db.url`** в долгоживущих процессах (серверы, воркеры). Синглтон `src/lib/db.ts` — единственный допустимый создатель без явного URL.
- P2037 от собственного приложения **не ретраить** — это не транзиентная ошибка, ретрай только усугубит. Лечить корень: либо уменьшить пул, либо добавить PgBouncer (Transaction pooling).
- При добавлении нового CJS-entry (не `src/`) для production — **сразу** добавить его в `COPY` в `Dockerfile`, иначе `MODULE_NOT_FOUND` в рантайме.

**Прямой каст Prisma `Json` поля к кастомному типу — ошибка сборки `may be a mistake because neither type sufficiently overlaps`.**
Prisma `Json` поля возвращают тип `JsonValue` (или `JsonArray` после `Array.isArray` narrowing). TypeScript не считает `JsonValue` достаточно совместимым с кастомными интерфейсами (например `KsActParticipant[]`) — прямой `as CustomType[]` вызывает ошибку `Conversion of type 'JsonArray' to type '...' may be a mistake`.
Ошибка проявляется только на деплое (тип-чек Next.js build) — локально без `node_modules` пропускается.
Правило: **никогда не кастовать Prisma `Json` поле напрямую** в кастомный тип — только через `unknown`:
```typescript
// Неправильно — ошибка сборки:
const items = form.participants as KsActParticipant[];

// Правильно — двойной каст через unknown:
const items = form.participants as unknown as KsActParticipant[];
```
При поиске похожих мест: `grep -r "as [A-Z][a-zA-Z]*\[\]" src/` и проверять, что источник — не Prisma `Json` поле.
Исправлено в `ks-acts/print/route.ts` (4 поля: participants, indicators, workList, commissionMembers) и `FinancialTableEditor.tsx` (columns, rows).

**Расширение Prisma enum → все non-Partial `Record<EnumType, ...>` ломают сборку.**
При добавлении нового значения в Prisma enum (`ExecutionDocType` получил `GENERAL_DOCUMENT`, `KS_6A`, `KS_11`, `KS_14`) TypeScript требует, чтобы все значения были покрыты в `Record<EnumType, T>`. Файлы `inbox/route.ts` и `pdf-generator.ts` имели неполные маппинги — сборка падала с `Type error: ... is missing the following properties`.
Правило: после добавления значения в Prisma enum **обязательно** выполнить:
```bash
grep -r "Record<ИмяEnum" src/
```
Для каждого найденного `Record<EnumType, ...>` без `Partial<>`:
- Добавить новые ключи в объект — если маппинг должен покрывать ВСЕ значения (Labels, Colors и т.п.)
- Или изменить тип на `Partial<Record<EnumType, ...>>` — если маппинг заведомо неполный (Templates, Handlers)
Источник истины для лейблов — `src/utils/constants.ts`; дублировать одни и те же метки в роутах не нужно — лучше импортировать из constants.

**Nullable Prisma relation в `include` — прямой доступ без null-check блокирует сборку.**
`JournalEntryRemark.entryId String?` → `entry SpecialJournalEntry?` — поле nullable.
Код `remark.entry.journal.projectId` без проверки → TS18047 при `Checking validity of types`.
Docker-build падает с `Type error: 'remark.entry' is possibly 'null'`.
Правило: если в Prisma `include` используется nullable relation (`Field?`) — перед обращением
к свойству добавлять явную проверку: `!remark.entry || remark.entry.journal.projectId !== ...`.
Не путать с non-nullable relations: `SpecialJournalEntry.journal` (не nullable) — доступ безопасен.

**Edit tool молча падает на stale context.**
Старый контент файла не совпадает с `old_string` → правка не применяется,
но инструмент не сообщает об ошибке. Всегда перечитывать файл перед edit,
особенно после 10+ сообщений в сессии.

**`findMany` без `take` — OOM при 1000+ записях.**
WorkRecord, Material, ExecutionDoc, Ks2Act, Photo, Defect — ВСЕГДА с `take`/`skip`.
Без пагинации → краш под нагрузкой или таймаут запроса.

**Prisma `groupBy` с `take` без `orderBy` — ошибка сборки TS2345.**
`db.model.groupBy({ by: [...], take: N })` без `orderBy` вызывает TS-ошибку:
`"If you provide 'take', you also need to provide 'orderBy'"`.
Prisma требует явный `orderBy` для детерминированной выборки при лимитировании.
Правило: любой `groupBy` с `take` **обязан** иметь `orderBy`.
Для top-N запросов использовать `orderBy: { _count: { id: 'desc' } }`.

**`db push` без миграции = P2022 `column X does not exist` в проде (Workspace workspaceId).**
Модель `Workspace` и поле `BuildingObject.workspaceId` были добавлены в `prisma/schema.prisma` через `db push` в dev-окружении без создания файла миграции. В prod таблица `workspaces` не существовала, `building_objects.workspaceId` не существовал. Следствие: `PrismaClientKnownRequestError P2022: column building_objects.workspaceId does not exist` при каждом запросе к `GET /api/projects`. Ошибка возникла несмотря на то, что последующие миграции (`20260421010000_add_subscriptions_payments`) ссылались на `workspaces` через FK — они либо работали на db-push версии БД, либо были помечены `--applied` без выполнения.
**Исправление:** создана идемпотентная миграция `20260421060000_add_workspace_missing_columns` которая через `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS` и `DO $$ BEGIN...EXCEPTION WHEN duplicate_object` добавляет все пропущенные элементы: enums `WorkspaceType`/`WorkspaceRole`, таблицы `workspaces`/`workspace_members`, колонки `users.activeWorkspaceId`, `building_objects.workspaceId` + индекс + FK.
**Правило**: каждое изменение `prisma/schema.prisma` (новая модель, новое поле, новый enum) **обязано** сопровождаться созданием migration файла: `npx prisma migrate dev --name <description>`. `db push` допустим только для быстрых экспериментов — **никогда** как финальный способ применения схемы. Проверка перед деплоем: `npx prisma migrate status` должен показывать "Database schema is up to date", а не "have not yet been applied".
Дополнительно: при добавлении FK к таблице, которая могла быть создана через `db push` — использовать `DO $$ BEGIN...EXCEPTION WHEN duplicate_object THEN NULL; END $$` для самого FK. `ALTER TABLE "t" ADD CONSTRAINT ... FOREIGN KEY` без DO $$ упадёт если constraint уже существует. Поиск нарушений: `grep -rn "ADD CONSTRAINT" prisma/migrations/ | grep -v "DO \$\$"`.

**Prisma crash loop на деплое.**
`migrate deploy` пытается применить уже существующие таблицы → "already exists" →
`set -e` в start.sh → перезапуск контейнера → loop.
Решение: в start.sh перечислять ВСЕ директории из `prisma/migrations/` как `--applied`.

**Смешивание `--rolled-back` и `--applied`.**
`--rolled-back` = миграция прервалась, перезапустить.
`--applied` = миграция уже выполнена через db push, только записать в историю.
Не путать — неверный флаг ломает историю миграций.

**`String[]` для хранения s3Keys — подходит только до ~10 файлов.**
В Модуле 5 использован `String[] @default([])` для ключей S3 (`s3Keys`).
PostgreSQL хранит как `text[]`; при большом объёме и частых обновлениях (>10 файлов)
эффективнее отдельная таблица `FileAttachment(id, s3Key, entityType, entityId)`.
Правило: `String[]` → 1–10 файлов; при потенциальном росте → отдельная модель.

**`linkedExecDocIds String[]` — двусторонняя связь через массив требует raw SQL.**
`prisma.findMany({ where: { linkedExecDocIds: { has: id } } })` ненадёжен при JOIN-запросах.
Двусторонняя привязка ПД → АОСР в Модуле 5 потребовала `db.$queryRaw` с raw SQL.
Правило: полиморфные массивы связей лучше моделировать явной join-таблицей, не `String[]`.

**`$queryRaw` с именами моделей вместо таблиц / snake_case колонками вместо camelCase — 42P01 в проде.**
`prisma.$queryRaw` отправляет SQL напрямую в PostgreSQL без трансляции имён.
Prisma-модели с `@@map("snake_table")` создают таблицу `snake_table`, но модель называется `PascalCase`.
Поля без `@map` создают колонки с тем же camelCase именем (`projectId`, `createdAt`).
В raw SQL **обязательно** использовать реальные имена: таблицы из `@@map`, колонки в кавычках (`"projectId"`).
PostgreSQL складывает unquoted идентификаторы в lowercase: `project_id` ≠ `projectId`.
Исправлено в 11 файлах (inbox/count, numbering.ts, 6 FTS роутов, 2 search роута, journal entries).
Правило: при написании `$queryRaw` / `$executeRaw` — **всегда** сверяться с `@@map` для таблиц
и использовать `"camelCase"` в кавычках для колонок. Единственное исключение — колонки,
явно созданные в snake_case через ALTER TABLE (например, `search_vector` — generated column для FTS).

**Два идентичных enum (`DesignTaskStatus` + `DesignDocStatus`) — сигнал о дублировании.**
Задания и документы движутся по одному workflow, но получили разные enum.
При следующем рефакторинге — единый `PIRWorkflowStatus` с `type`-дискриминатором.
Это уменьшит количество state-machine файлов и упростит ApprovalRoute интеграцию.

---

## TypeScript / ESLint

**`useForm<z.infer<schema>>` + `.default()` в схеме → TS2345 на деплое.**
`z.infer<typeof schema>` возвращает OUTPUT-тип Zod (после применения дефолтов): поля с `.default()` становятся обязательными.
`zodResolver` ожидает INPUT-тип (до Zod-обработки): те же поля — опциональные (`field?: T | undefined`).
Explicit generic `useForm<OutputType>` задаёт `TFieldValues = OutputType`, но resolver принимает `ResolverOptions<InputType>` → TypeScript бьёт TS2345 при сборке.
Ошибка видна ТОЛЬКО на `next build` (type-check фаза) — локально без `node_modules` молчит.
Затронуто: `AddScheduleDialog.tsx` (`.default('DAY')`, `.default(1)`, `.default(true)`, `.default(false)`),
`CreateTaskGroupDialog.tsx` (`.default(0)`), `CreateTaskLabelDialog.tsx` (`.default('#6366f1')`),
`CreateTaskTemplateDialog.tsx` (`.default('MEDIUM')`, `.default('hours')`).
**Два корректных варианта:**
```typescript
// Вариант 1 (предпочтительный): убрать explicit generic — RHF выводит тип сам
const { handleSubmit } = useForm({
  resolver: zodResolver(schema),
});
// type FormData = z.infer<typeof schema> ОСТАВИТЬ если используется в onSubmit, setValue и т.п.

// Вариант 2: использовать INPUT-тип явно
type FormData = z.input<typeof schema>;
const { handleSubmit } = useForm<FormData>({
  resolver: zodResolver(schema),
});
```
**Правило**: если схема содержит `.default()` на любом поле — **не использовать** `useForm<z.infer<typeof schema>>`.
Альтернативно: `useForm<z.input<typeof schema>>` (как в `AddDefectDialog.tsx` — правильный паттерн).
Поиск потенциальных нарушений: файлы с одновременным `useForm<` и `.default(` в схеме:
```bash
grep -rl "useForm<" src --include="*.tsx" | xargs grep -l "\.default("
```

**`Record<string, unknown>` не совместим с Prisma `InputJsonValue` — ошибка сборки.**
`z.record(z.string(), z.unknown())` даёт тип `Record<string, unknown>`. При передаче в Prisma
JSON-поле TypeScript ругается: «Type 'Record<string, unknown>' is missing the following
properties from type 'readonly (InputJsonValue | null)[]'». Причина: Prisma ожидает
`InputJsonValue = string | number | boolean | InputJsonObject | InputJsonArray`, а `unknown`
не совместим ни с одной веткой.
Правило: при записи `z.record(z.string(), z.unknown())` в Prisma JSON-поле — **всегда** приводить:
```typescript
// Nullable JSON-поле:
requisites: requisites !== null ? (requisites as Prisma.InputJsonValue) : Prisma.JsonNull
// Опциональное JSON-поле:
data: data !== undefined ? data as Prisma.InputJsonValue : undefined
// Обязательное JSON-поле:
blockDefinitions: blockDefinitions as Prisma.InputJsonValue
```
Никогда не делать просто `requisites ?? Prisma.JsonNull` без явного `as Prisma.InputJsonValue` —
TypeScript не может вывести что `Record<string, unknown>` это валидный `InputJsonValue`.
Зафиксировано в `journals/[journalId]/route.ts` → поле `requisites`.

**Prisma nullable FK с `null` в update `data` — union type conflict.**
Prisma генерирует для `data` в `update()` union: relation form (`ModelUpdateInput`) | raw-FK form
(`ModelUncheckedUpdateInput`). В relation form сырые FK-поля должны быть `undefined`, не `null`.
Zod `.optional().nullable()` даёт `string | null | undefined`. Когда `null` попадает в объект
без явной типизации, TypeScript пытается оба варианта union и падает на `null ≠ undefined`.
Правило: при наличии хотя бы одного nullable FK-поля (`contractId`, `assigneeId` и т.п.) в
объекте update data — **всегда** типизировать его явно:
```typescript
const updateData: Prisma.ModelUncheckedUpdateInput = { ... };
await db.model.update({ where: ..., data: updateData, ... });
```
Зафиксировано в `journals/route.ts` (`contractId`), `rfi/route.ts` (`assigneeId`).

**FK-поле без `@relation` в Prisma schema → `include` падает на деплое.**
Поля `responsibleOrgId`/`responsibleUserId` существовали как `String?` без `@relation`.
Код делал `include: { responsibleOrg, responsibleUser }` — Prisma-клиент таких связей
не знает → TS-ошибка при сборке (локально скрыта: нет `node_modules`).
Правило: любой FK-поле (`fooId String?`) ОБЯЗАН сопровождаться `@relation` в той же
модели И обратной связью в целевой модели. Без `@relation` Prisma не генерирует тип
для `include`. Добавление `@relation` к существующему FK не требует новой миграции
(нет новых колонок) — достаточно `prisma generate` на сборке.

**Zod `z.enum([...])` не совпадает с Prisma enum → TS2322 на деплое.**
Локально скрыто (нет `node_modules` и `@prisma/client`). На деплое Prisma-тип строго
проверяется → строка `'PASSED'` несовместима с `ExpertiseStatus`. cast `as PrismaEnum`
маскирует проблему — значение в runtime всё равно невалидно. Правило: для Prisma enum
полей **всегда** использовать `z.nativeEnum(PrismaEnumName)` — тип автоматически
синхронизирован с Prisma schema и не расходится при изменении enum значений.

**`import { z } from 'zod/v4'` — несуществующий subpath, ломает production build.**
zod@4.x НЕ экспортирует subpath `./v4`. Верный импорт для zod v4.x — `from 'zod'`.
Ошибка проявляется только на деплое (Next.js build «Checking validity of types»),
локально tsc не виден из-за отсутствия `node_modules`.
Причина распространения: кодовая база использовала `zod/v4` как pre-existing паттерн,
который тиражировался при создании новых файлов.
**Правило**: всегда проверять `package.json` exports при использовании subpath-импортов.
Единственный верный импорт: `import { z } from 'zod'`.

**React namespace без импорта (`React.ReactNode`) — ошибка сборки в Next.js 14.**
Next.js 14 автоматически трансформирует JSX, импорт `React` не нужен для JSX.
Но обращение к `React.ReactNode` как к пространству имён требует явного импорта.
Правило: использовать `import type { ReactNode } from 'react'` вместо `React.ReactNode`.

**Не проверять tsc после правки → ошибки уходят в прод.**
Правило: `npx tsc --noEmit` обязателен после КАЖДОЙ записи файла.
Нельзя говорить «готово» без прохождения tsc.

**`any` в новом коде → потеря типовой безопасности.**
TypeScript strict mode включён. Любой `any` — это будущий runtime баг.
Если тип неизвестен — использовать `unknown` + type guard.

**`Buffer<ArrayBufferLike>` не присваивается `BodyInit` в `new NextResponse()`.**
`NextResponse` ожидает `BodyInit` (Web API тип). Node.js `Buffer` не совместим.
Ошибка проявляется только на деплое (type checking фаза Next.js build).
Правило: при возврате бинарных данных из API route всегда оборачивать:
`new NextResponse(new Uint8Array(buffer), { headers: {...} })`.
Паттерн уже есть в `src/app/api/templates/[id]/generate/route.ts` — переиспользовать.

**`ZodError.errors` → `ZodError.issues` в Zod v4.**
В Zod v4 (`^4.x`) поле `.errors` переименовано в `.issues`.
8 API-роутов в `estimate-versions/` использовали старый `.errors[0].message` →
ошибка сборки `Property 'errors' does not exist on type 'ZodError<...>'`.
Правило: всегда использовать `parsed.error.issues[0].message`. При обновлении
Zod с v3 → v4 сделать глобальный поиск `\.error\.errors` по всему проекту.

**`required_error` / `invalid_type_error` — удалены в Zod v4.**
В Zod v3 `z.string({ required_error: '...', invalid_type_error: '...' })` были стандартным паттерном.
В Zod v4 эти поля не существуют → ошибка сборки `'required_error' does not exist in type`.
Дополнительно: `z.enum(['a', 'b'])` требует `readonly` tuple — нужно добавлять `as const`.
Правило: использовать `{ error: '...' }` или просто строку вторым аргументом.
При поиске ошибок — грепать `required_error` и `invalid_type_error` по всему `src/`.

**`successResponse(data, 201)` — число вместо `PaginationMeta`.**
`successResponse(data, meta?)` принимает `PaginationMeta` вторым аргументом, не HTTP-код.
Передача числа (200, 201, 204) TypeScript принимал молча (тип `meta` был `unknown` или
совместим с `number`), но это семантически неверно — HTTP-код игнорировался.
Правило: `successResponse` всегда вызывать с одним аргументом если нет пагинации.
HTTP 200 — дефолт, явно передавать не нужно.

**Поле хука объявлено в state, но не включено в return — ошибка деструктурирования.**
`useEstimateCompare` объявлял `const [v2Id, setV2Id] = useState(null)` и использовал
`v2Id` внутри (`canCompare`, `runCompare`), но забыл включить `v2Id` в `return { ... }`.
Компонент деструктурировал `v2Id` — TS-ошибка `Property 'v2Id' does not exist`.
Правило: при добавлении нового state в хук сразу добавлять его в return-объект.
Проверять возвращаемый объект хука совпадает с тем что деструктурирует компонент.

**`Array/Map/Set .entries()/.keys()/.values()` в `for...of` без `Array.from()` — ошибка при target < ES2015.**
`for (const [i, v] of arr.entries())` и `for (const g of map.values())` вызывают TS-ошибку
`Type 'MapIterator<T>' (или 'IterableIterator') can only be iterated through when using '--downlevelIteration'`.
Ошибка проявляется только на `next build` — локально без `node_modules` молчит.
Правило: **всегда** оборачивать в `Array.from()`:
```typescript
for (const [i, v] of Array.from(arr.entries())) { ... }
for (const g of Array.from(map.values())) { ... }
for (const k of Array.from(map.keys())) { ... }
```
Зафиксировано в `useTaskGroups.ts` (`map.values()`).
Относится к: `Array.entries/keys/values`, `Map.entries/keys/values`, `Set.values`.
Поиск нарушений: `grep -rn "\.values()\|\.keys()\|\.entries()" src | grep "for.*of" | grep -v "Array\.from" | grep -v "Object\."`

---

## React / Next.js

**Строковый литерал в объекте массива расширяется до `string` — TS2322 при присваивании к `union literal` типу.**
При построении массива `[{ type: 'created', ... }, ...spread]` TypeScript инферит тип элемента как объединение
типов всех элементов. Если хотя бы один объект имеет `type: 'someValue'` без `as const`, TypeScript расширяет
его до `string`. При присваивании к `TypedEntry[]` где `type: 'created' | 'report'` — TS2322 на деплое.
Ошибка видна ТОЛЬКО на `next build` (type-check фаза) — локально без `node_modules` молчит.
Обнаружено в `TaskHistoryTab.tsx:34` — объект `{ type: 'created' }` без `as const`, тогда как соседние
элементы в `.map()` уже использовали `type: 'report' as const`.
**Правило**: в объектах внутри массивов всегда использовать `as const` для строковых литералов,
если тип поля — union literal:
```typescript
// Неправильно — TypeScript расширяет 'created' до string:
const entries: HistoryEntry[] = [
  { type: 'created', ... },
  ...items.map(i => ({ type: 'report' as const, ... })),
];

// Правильно — все литералы узкие:
const entries: HistoryEntry[] = [
  { type: 'created' as const, ... },
  ...items.map(i => ({ type: 'report' as const, ... })),
];
```
Поиск потенциальных нарушений: гетерогенные массивы с `as const` на части элементов, но не на всех.

**`ApiResponse<T>` — discriminated union, `.data` без `success`-проверки не компилируется.**
`ApiResponse<T>` из `@/types/api` — union-тип:
`{ success: true; data: T } | { success: false; error: string; details?: unknown }`.
Обращение к `json.data` без проверки `json.success` → TS-ошибка:
«Property 'data' does not exist on type '{ success: false; error: string; details?: unknown }'».
Проверка `if (!res.ok)` **не сужает** тип: TypeScript не знает, что `res.ok === true` влечёт
`json.success === true`. Нужно явно сузить тип через success-guard:
```typescript
// Правильно:
const json: ApiResponse<T> = await res.json();
if (!json.success) throw new Error(json.error);
return json.data;

// Неправильно (не компилируется):
const json: ApiResponse<T> = await res.json();
return json.data ?? []; // TS2339: Property 'data' does not exist...
```
Правило: **всегда** добавлять `if (!json.success) throw new Error(json.error)` перед
обращением к `json.data` когда тип аннотирован как `ApiResponse<T>` из `@/types/api`.
Зафиксировано в `JournalEntryLinkDialog.tsx` (два запроса в одном файле).

**`<SelectItem value="">` — runtime-ошибка во всём проекте (28 вхождений в 18 файлах).**
Radix UI `@radix-ui/react-select` v2.2.6+ добавил валидацию: `value` не может быть пустой строкой.
Ошибка: «A \<Select.Item /> must have a value prop that is not an empty string».
Срабатывает при рендере — даже для `disabled`-элементов, даже если они никогда не выбираются.
Причина распространения: паттерн `<SelectItem value="">Все</SelectItem>` был скопирован при создании
новых фильтров и диалогов по всему проекту без проверки версии Radix UI.
Правило:
- Фильтр «Все/Сбросить»: `value="ALL"`, `<Select value={state || 'ALL'} onValueChange={(v) => setState(v === 'ALL' ? '' : v)}>`
- Необязательное поле «Не указан/Без привязки»: `value="NONE"`, аналогичный адаптер
- Disabled-заглушка «Нет данных»: `value="__PLACEHOLDER__"`, стейт не трогать
- Внутренний стейт (`''` = нет фильтра) и вся логика `state || undefined` / `if (state)` не меняются.
Зафиксировано в `docs/patterns.md` в разделе «Известные ловушки TypeScript / React».

**`Failed to find Server Action` у пользователей после деплоя.**
У пользователей с открытыми вкладками устаревают Server Action ID.
Решение уже в `src/app/error.tsx` — `window.location.reload()` при этой ошибке.
При создании новых error boundary — использовать тот же паттерн.

**Handlebars шаблоны — не кэшировать через readFileSync в теле функции.**
Вызов `fs.readFileSync` + `Handlebars.compile()` внутри функции = блокирует event loop
при каждом вызове. Паттерн: `let templatePromise: Promise<...> | null = null` на уровне
модуля, инициализировать один раз.

---

## Безопасность

**`NEXTAUTH_SECRET` как fallback для `CRON_SECRET`/`ADMIN_SECRET` — смешение разных ключей.**
Паттерн `const secret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET` кажется удобным
на старте (не нужно добавлять новую переменную), но создаёт уязвимость: `NEXTAUTH_SECRET`
предназначен для подписи JWT-сессий, и если он утечёт — злоумышленник получает доступ
и к cron-эндпоинтам, и к admin-эндпоинтам. Обратное тоже верно: смена `NEXTAUTH_SECRET`
(при ротации) неожиданно ломает cron.
Зафиксировано в: `cron/inspection-reminder/route.ts`, `cron/prescription-deadline/route.ts`,
`admin/setup-s3/route.ts` — fallback убран.
**Правило**: каждый тип Bearer-аутентификации использует **собственную** переменную окружения.
`NEXTAUTH_SECRET` — только для NextAuth. `CRON_SECRET` — только для cron. `ADMIN_SECRET` — только для admin.
`CRON_SECRET` и `ADMIN_SECRET` — **опциональные** (не в `REQUIRED_ENV_VARS`): без них сервер стартует,
cron возвращает 401, admin падает на сессионную проверку — это безопасно.
Задокументированы в `.env.example`.
Поиск нарушений: `grep -r "NEXTAUTH_SECRET" src/app/api/ | grep -v "auth"`.

**Добавление опционального секрета в `REQUIRED_ENV_VARS` — краш сервера на деплоях без него.**
`CRON_SECRET`/`ADMIN_SECRET` были добавлены в обязательные переменные — при деплое без них
сервер падал при старте с `[env] Отсутствуют...`, NextAuth получал 500 вместо JSON →
`CLIENT_FETCH_ERROR` во всём приложении.
Различие: **инфраструктурные** (`DATABASE_URL`, `NEXTAUTH_SECRET`, S3, Redis) — сервер не может
работать без них → `REQUIRED_ENV_VARS`. **Операционные Bearer-секреты** (`CRON_SECRET`,
`ADMIN_SECRET`) — их отсутствие безопасно (401/сессионная auth), добавлять в required не нужно.
Правило: в `REQUIRED_ENV_VARS` только то, без чего невозможно обработать ни один запрос.

**API роут без проверки organizationId = утечка данных между тенантами.**
Каждый новый роут обязан фильтровать по `organizationId` из сессии.
Никогда findFirst/findUnique только по `id` — всегда добавлять `organizationId`.

**Pre-signed URL без TTL = постоянный публичный доступ к файлам.**
TTL для pre-signed URL: 1 час. Никогда не делать файлы S3 публично доступными напрямую.

---

## Архитектура / Паттерны

**State machine в отдельном файле — обязательный паттерн для workflow-модулей.**
Модуль 5 создал 3 файла: `task-state-machine.ts`, `doc-state-machine.ts`, `closure-state-machine.ts`.
Переходы статусов изолированы, переиспользуются в API-роутах, тестируются отдельно от UI.
Правило: любой модуль с >2 статусами документа → `src/lib/[module]/[entity]-state-machine.ts`.
Не писать `if/switch` переходов прямо в route handler.

**`type`-дискриминатор вместо двух моделей — правильно при < 20% различий в полях.**
ЗП (DESIGN) и ЗИ (SURVEY) в Модуле 5 реализованы через `DesignTask.taskType`.
Переиспользовано ~90% кода: компоненты, хуки, API, state machine.
Отдельная модель `SurveyTask` потребовала бы удвоения кода без реальной пользы.
Правило: если сущности отличаются < 20% полей — `type` дискриминатор, не отдельные модели.

**ApprovalRoute переиспользован в 3 типах документов одного модуля.**
`DesignTask`, `DesignDocument`, `PIRClosureAct` — все используют `approvalRouteId`.
Это подтверждает паттерн: workflow согласования — сквозная инфраструктура.
Правило: новые модули НЕ создают собственный approval-workflow — только подключают `approvalRouteId`.

---

## Производительность

**Grep не находит все референсы при переименовании.**
Одна grep не гарантирует полноту. Искать отдельно:
type-level refs, string literals, dynamic imports, re-exports, тестовые файлы, barrel index.ts.

**Socket.io — не запускать в Next.js API Route.**
Socket.io сервер — отдельный процесс на порту 3001.
Смешивание с Next.js API = конфликт с серверлесс моделью деплоя.

**Redis ECONNREFUSED спам в логах — rate-limiting обязателен для ioredis error handler.**
При недоступном Redis (Timeweb Managed Redis на обслуживании, сетевая ошибка) ioredis
генерирует `error` event при каждой попытке переподключения. Без rate-limiting логи
заполняются десятками ошибок в секунду, маскируя реальные проблемы.
Правило: `client.on('error')` **всегда** с rate-limiting (max 1 раз в 30 секунд).
`retryStrategy` с `return null` после N попыток — иначе ioredis переподключается вечно.
BullMQ воркеры: `maxRetriesPerRequest: null` (требование BullMQ), но `worker.on('error')`
с тем же rate-limiting. Воркеры запускать ТОЛЬКО после проверки доступности Redis.

---

## Архитектура API

**Два параллельных пути API для одной сущности = 171 потенциальный дубликат + багтрекер.**
В `stroydocs/src/app/api/` исторически сосуществовали `api/objects/[objectId]/*` (238 `route.ts`)
и `api/projects/[projectId]/*` (382 `route.ts`) — следствие незавершённой миграции URL. 170 из
них были парами-«близнецами», из которых ~15 имели скрытые расхождения (например,
`[objectId]/route.ts` поддерживал `actualStartDate` в PUT, twin в projects/ — нет; `sed/route.ts`
полностью отличался workflow-моделью видимости; `change-orders` в objects/ имел `changeType` +
пересчёт суммы договора в транзакции, в projects/ был только простой `create`). Слепое удаление
«дубликатов» через `rm` потеряло бы поведение из objects/-веток.

Поверх этого: клиент вызывал **оба** пути вперемешку (~248 вхождений `/api/objects/` в 127 файлах,
плюс ~400 `/api/projects/` в других местах), из-за чего починка бага в одном пути не чинила его
на другом — это источник постоянных «почему тут работает, а там нет».

**Правило**: канонический путь API для `BuildingObject` — только `/api/projects/[projectId]/*`.
UI-URL `/objects/[objectId]/*` сохраняется (сознательный рассинхрон API↔UI, привязан к имени FK
`projectId` в Prisma). При появлении идеи «сделать URL API консистентным с UI» — **нет**.
Переименование `projectId` ломает `$queryRaw`, миграции и `@relation`-поля, которые завязаны на
колонку `projectId` в `Contract`, `Defect`, `ProblemIssue`, `PIRClosureAct`, `GanttVersion`,
`GanttStage`, `FundingRecord` и др.

**Процесс слияния параллельного API** (если когда-нибудь повторится): автоматический классификатор
пар (`sed -E 's/\bobjectId\b/projectId/g'` + `diff -u`) переводит 171 ручной дифф в ~20 ручных
(только NEEDS_REVIEW). Для каждого NEEDS_REVIEW делается **port-first, delete-second**: сначала
переносятся улучшения в целевую ветку отдельным коммитом, только затем удаляется источник.
Multi-tenancy (`db.buildingObject.findFirst({ where: { id, organizationId } })`) при любом переносе
сверяется в обеих версиях и берётся более строгий вариант. Фронтовая замена только первого сегмента
URL `/api/objects` → `/api/projects`: имена переменных в template literals (`${objectId}`) не
трогаются — это клиентский код, значения остаются теми же.

---

## Среда разработки / CI

**`npx tsc --noEmit` и `npx eslint` не работают без node_modules.**
В окружении без установленных зависимостей (`npm install` не запускался):
— `tsc` выдаёт сотни `TS2307: Cannot find module` — всё это инфраструктурные ошибки, не баги кода.
— `npx eslint` подхватывает глобальную версию (v10+), которая не поддерживает `.eslintrc.json` (v8 формат).
Оба инструмента дают false-positive только из-за отсутствия `node_modules`.
Правило: перед верификацией проверять что `node_modules/` существует.
Команды должны запускаться через локальный бинарник: `./node_modules/.bin/tsc --noEmit`.

**Статический список `--applied` в start.sh — гарантированная бомба замедленного действия.**
Старый start.sh помечал ВСЕ 48 миграций как `--applied` при КАЖДОМ запуске контейнера.
На существующей БД (таблицы из `db push`) это работало. Но если БД была сброшена/создана
заново — ни одна таблица не создаётся: `migrate deploy` думает что всё уже применено.
В проде: `P2021: The table 'public.special_journals' does not exist` — таблица не была
создана, потому что миграция `20260405120000_add_module9_journals` помечена как applied.
**Решение**: заменён статический список на динамическую стратегию в start.sh:
1. Проверка целостности (scripts/check-migration-integrity.js): если _prisma_migrations
   содержит записи, но ключевые таблицы отсутствуют → TRUNCATE _prisma_migrations.
2. `migrate deploy` в цикле: при ошибке "already exists" (таблица из db push) →
   `resolve --applied` для конкретной миграции → повтор. Это безопасно работает
   на свежей БД (все миграции выполняются), на db-push БД (уже созданные пропускаются),
   и на БД со сбитыми записями (сброс + повторное применение).
**Правило**: НИКОГДА не использовать статический список `--applied` в start.sh.
Новые миграции не нужно нигде регистрировать — `migrate deploy` применит их автоматически.

---

**`mutationFn` body type не включает поле → TS2353 при вызове `.mutate()` с новым полем.**
`useCreateTaskGPR` объявлял тип тела без `sortOrder`. `handleAddBelow` и `handleCopy`
передавали `sortOrder: task.sortOrder + 1` → ошибка сборки `Object literal may only
specify known properties, and 'sortOrder' does not exist in type`.
API-роут уже принимал поле через Zod-схему — несоответствие было только в типе хука.
**Правило**: при добавлении нового поля в вызов `.mutate()` **сразу** добавлять его
в тип `mutationFn` тела. Проверять: тип body хука ↔ Zod-схема API-роута ↔ фактические
вызовы `.mutate()` в компонентах должны быть синхронизированы.

---

**`import { toast } from '@/components/ui/use-toast'` — несуществующий путь, ломает production build.**
В проекте toast-хук находится в `@/hooks/useToast` (файл `src/hooks/useToast.ts`).
Путь `@/components/ui/use-toast` не существует — Next.js находит ошибку только на этапе webpack-сборки:
`Module not found: Can't resolve '@/components/ui/use-toast'`.
Локально проблема скрыта: TypeScript не проверяет путь без `node_modules`, ESLint тоже молчит.
Файл-нарушитель: `useNormativeRefs.ts` (добавлен в рамках Модуля 11).
Причина: при создании файла был скопирован несуществующий паттерн вместо используемого в проекте.
**Правило**: в этом проекте единственный правильный импорт для toast — `import { toast } from '@/hooks/useToast'`.
Перед добавлением нового хука с toast — grep: `grep -r "useToast\|use-toast" src/ | head -3` и использовать тот путь, который уже есть в проекте.

**`['VALUE'] as const` в Prisma `where` — `readonly` tuple несовместим с `EnumField[]`.**
`{ in: ['OPEN', 'IN_PROGRESS'] as const }` создаёт `readonly ["OPEN", "IN_PROGRESS"]`.
Prisma ожидает `DefectStatus[]` (mutable array) → TS2322 на деплое.
Ошибка возникает при spread такого объекта в `defectWhere` и при прямом использовании в `groupBy`/`count`.
Также: `{ in: ['OPEN', 'IN_PROGRESS'] }` без `as const` даёт `string[]`, что тоже несовместимо с `DefectStatus[]`.
**Правило**: для enum-фильтров Prisma всегда использовать явный каст к типу из `@prisma/client`:
`{ in: ['OPEN', 'IN_PROGRESS'] as DefectStatus[] }`.
Никогда не использовать `as const` в Prisma-запросах — только `as EnumName[]`.

**Prisma `groupBy` с `_count: { field: true }` — `r._count.field` вызывает TS18048 + TS2339.**
Typescript видит тип `_count` в результате `groupBy` как `true | { field?: number }`, а не `{ field: number }`.
Обращение `r._count.id` даёт TS18048 (`_count` possibly undefined) и TS2339 (`Property 'id' does not exist on true`).
Ошибка проявляется только на деплое (type checking Next.js build).
**Правило**: при доступе к `_count` после `groupBy` — всегда явный каст:
`(r._count as { id: number }).id` или `(r._count as Record<string, number>)[fieldName]`.

**Поле `normativeRefs` добавлено в API-ответ, но не добавлено в TypeScript-интерфейс `DefectItem`.**
API `/api/projects/[projectId]/defects/[defectId]` включает `normativeRefs` через `include`.
`DefectDetailCard.tsx` использует `defect.normativeRefs` — но `DefectItem` в `useDefects.ts` не имел этого поля.
Результат: TS2551 `Property 'normativeRefs' does not exist on type 'DefectItem'` на деплое.
Локально не видно: tsc требует `node_modules` для проверки, без них ошибка молчит.
**Правило**: при добавлении нового поля в `include` API-роута — одновременно добавлять его в соответствующий
TypeScript-интерфейс в хуке (`use*.ts`). Проверять: API include ↔ интерфейс хука ↔ использование в компоненте.

**`wget exit code 8` из `services/ifc-service/Dockerfile` — S3-хостинг IfcConvert умер.**
`https://s3.amazonaws.com/ifcopenshell-builds/IfcConvert-v0.7.0-linux64.zip` возвращает HTTP ошибку (~2025+).
Дополнительно: версия бинарника (0.7.0) не совпадала с Python-пакетом `ifcopenshell==0.8.0` в requirements.txt.
Оба должны быть одной версии — они часть одного codebase IfcOpenShell.
Побочный эффект: debconf warnings «TERM is not set» от apt-get — отсутствие `ENV DEBIAN_FRONTEND=noninteractive`.
**Правило**: для внешних бинарников (IfcConvert, IfcConvert и подобных) не полагаться на сторонние S3-бакеты.
Надёжные варианты (в порядке предпочтения):
1. Загрузить бинарник в свой Timeweb S3 (нет внешней зависимости) — передавать URL через `ARG IFCCONVERT_URL`
2. GitHub Releases (`https://github.com/IfcOpenShell/IfcOpenShell/releases/download/v0.8.0/IfcConvert-v0.8.0-linux64.zip`)
3. Добавить retry-цикл (5 попыток с паузой 15 сек) — как в npm install
Всегда синхронизировать версию бинарника с pip-пакетом: `IfcConvert-v0.8.0` ↔ `ifcopenshell==0.8.0`.
`DEBIAN_FRONTEND=noninteractive` — ENV (не ARG) для `python:3.11-slim` и любых `*-slim` образов с apt-get.
Добавлять `libgomp1` в apt-get — OpenMP runtime, требуется многопоточным C++ бинарникам (IfcConvert, FFmpeg и др.).
Правильная стратегия для Dockerfile IfcConvert: 1) проверить наличие в pip-пакете, 2) скачать по `ARG IFCCONVERT_URL`, 3) fail с явной инструкцией. Захардкоженный URL внешнего S3 — антипаттерн.

**`Module not found: Can't resolve '@/components/ui/collapsible'` — shadcn/ui компонент не добавлен в репозиторий.**
shadcn/ui компоненты генерируются CLI (`npx shadcn-ui@latest add collapsible`) и требуют `@radix-ui/react-collapsible` зависимость.
Если зависимость отсутствует в `package.json` и `package-lock.json` — импорт компонента ломает сборку.
Обнаружено в `CollisionDetector.tsx` → `@/components/ui/collapsible` (только один файл в проекте).
Проблема: компонент написан, но файл `src/components/ui/collapsible.tsx` не был добавлен в репозиторий.
**Правило**: при использовании shadcn/ui компонента (`Collapsible`, `Accordion` и т.п.) —
либо добавить зависимость в `package.json` и сгенерировать файл через CLI,
либо написать самодостаточную реализацию без Radix UI (как для `Checkbox`, `RadioGroup`).
Предпочтительный подход для простых компонентов (toggle, accordion): самодостаточная реализация
через React Context + cloneElement без добавления зависимости.

**`function` declaration в блоке — TS-ошибка в strict mode при target ES5.**
`function enrichElement(...)` объявлена внутри `try`-блока в `diff/route.ts:124`.
TypeScript/Next.js бьёт ошибку: «Function declarations are not allowed inside blocks in strict mode when targeting 'ES5'. Modules are automatically in strict mode.»
Тип проверки видит нарушение только при `next build` (не в редакторе).
**Правило**: функции-хелперы внутри `try/catch`, `if`, циклов и других блоков объявлять
через `const` + стрелочную функцию: `const fn = (x: T): R => {...}` вместо `function fn(x: T): R {...}`.
Функции верхнего уровня (`export async function POST`) под это правило не попадают.

**`{ ...spread } as Prisma.InputJsonValue` — ошибка сборки «Conversion of type '...' may be a mistake».**
Prisma генерирует `InputJsonValue = string | number | boolean | InputJsonObject | InputJsonArray`.
TypeScript не считает `{ clashStatus: string; ... }` достаточно совместимым с этим union — нет
перекрытия с primitive-ветками. Прямой `as InputJsonValue` вызывает TS2352 на деплое.
Ошибка проявляется только при `next build` (type-check фаза) — локально без `node_modules` молчит.
Затронуло 4 файла: `run-clash.worker.ts` (2 места), `parse-ifc.worker.ts`, `convert-ifc.worker.ts`,
`bim/models/[modelId]/clash/route.ts`.
**Правило**: при сохранении любого объекта в Prisma JSON-поле через `update`/`create` — **всегда**
использовать двойной каст:
```typescript
// Неправильно — ошибка сборки:
metadata: { ...existingMeta, status: 'DONE' } as Prisma.InputJsonValue

// Правильно:
metadata: { ...existingMeta, status: 'DONE' } as unknown as Prisma.InputJsonValue
```
Проверять все файлы: `grep -r "} as Prisma.InputJsonValue" src/` — не должно быть совпадений.

**`find \( -name 'A' -o -name 'b' \) -exec ... \;` в Docker multi-line RUN — ненадёжный парсинг.**
Dockerfile строка с `\` continuation + `find \( ... -o ... \) -exec ... \;`:
парсер `/bin/sh` внутри Docker может трактовать экранированные скобки и `;` неожиданно.
Симптом: `find: '/tmp/ifcconvert': No such file or directory` — директория создана `unzip`,
но `find` не видит её (или RUN-шаг парсится не так как ожидается).
**Правило**: в Docker multi-line RUN (`\` continuation) избегать `\( ... \)` и `\;` в `find`.
Заменять на два отдельных `find` с `if [ -z "$BIN" ]`:
```dockerfile
IFCBIN=$(find /tmp/ifcconvert -maxdepth 5 -type f -name 'IfcConvert' | head -1) && \
if [ -z "$IFCBIN" ]; then IFCBIN=$(find /tmp/ifcconvert -maxdepth 5 -type f -name 'ifcconvert' | head -1); fi && \
test -n "$IFCBIN" && mv "$IFCBIN" /usr/local/bin/IfcConvert
```
Дополнительно: чистить `/tmp/ifcconvert.zip` и `/tmp/ifcconvert` в начале каждой retry-попытки
(`rm -rf` перед `wget`), чтобы мусор от предыдущей попытки не влиял.

**Prisma relation field `project` vs `buildingObject` — не все модели с `projectId` используют одинаковое имя relation.**
Модели `GanttStage`, `FundingRecord`, `GanttVersion` имеют relation `project BuildingObject @relation(...)`.
Модели `ProblemIssue`, `PIRClosureAct`, `Defect`, `Contract` имеют relation `buildingObject BuildingObject @relation(...)`.
Все они хранят FK в поле `projectId`, но **имя relation отличается**.
В `dashboard/analytics/route.ts` два запроса использовали `{ project: objWhere }` для `ProblemIssue` и `PIRClosureAct` —
ошибка сборки: `'project' does not exist in type 'ProblemIssueWhereInput'`.
Ошибка проявляется только на деплое (type-check фаза Next.js build) — локально без `node_modules` молчит.
**Правило**: при написании Prisma `where` с relation-фильтром — **всегда** проверять имя relation в `schema.prisma`.
Наличие FK `projectId` **не означает** что relation называется `project` — оно может быть `buildingObject`.
Быстрая проверка: `grep -A2 'projectId.*String' prisma/schema.prisma | grep '@relation'`.

**`select: { name: true }` на User relation — модель User не имеет поля `name`.**
`User` модель хранит имя в двух полях: `firstName` и `lastName`. Поле `name` не существует.
`dashboard/sk-drill/route.ts` использовал `assignee: { select: { id: true, name: true } }` →
ошибка сборки: `'name' does not exist in type 'UserSelect<DefaultArgs>'`.
Ошибка проявляется только на деплое (type-check фаза Next.js build) — локально без `node_modules` молчит.
**Правило**: при `select`/`include` на User relation — **всегда** `{ id: true, firstName: true, lastName: true }`.
Если нужна строка с полным именем — конкатенировать в маппинге: `` `${u.firstName} ${u.lastName}` ``.

**Prisma P1001/P1008/P1017 — транзиентные ошибки БД крашили ВСЕ роуты одновременно.**
При кратковременной недоступности PostgreSQL (сеть, обслуживание Timeweb Managed DB) все
параллельные запросы пользователей получали 500. Затронуто: `inbox/count` ($queryRaw),
`objects` (findMany), `dashboard/widgets` (findMany), `dashboard/stats` (Promise.all из 9 count),
`dashboard/analytics` (Promise.all из 19 запросов), `analytics/global` (7 запросов).
После восстановления БД — P2037 (Too many connections) от лавины переподключений.
Исправлено: в `src/lib/db.ts` добавлен Prisma `$extends` с автоматическим retry (1 попытка,
500 мс задержка) для ВСЕХ операций — model queries, $queryRaw, $executeRaw.
Это покрывает все роуты проекта без изменения каждого файла.
`safe()` в `dashboard-helpers.ts` оставлен для изоляции ошибок в агрегационных роутах
(partial failure → fallback), retry из неё убран (теперь на уровне клиента).
**Правило**: retry транзиентных ошибок — на уровне Prisma-клиента (`db.ts`).
Изоляция partial failure — `safe(fn, fallback)` для агрегационных роутов с 3+ запросами.
Транзиентные коды: P1001 (сервер недоступен), P1008 (таймаут), P1017 (соединение закрыто).
P2037 (Too many connections) — НЕ ретраить, нужен PgBouncer.

**`PrismaTx` через `Parameters<PrismaClient['$transaction']>` ломает сборку при `$extends`.**
При добавлении `$extends` в `db.ts` тип `db` меняется с `PrismaClient` на `DynamicClientExtensionThis<...>`.
Функции, принимающие `tx: PrismaTx` (где `PrismaTx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]>`),
получают несовместимый тип при вызове из `db.$transaction(async (tx) => importFn(tx, ...))`.
Ошибка проявляется только на деплое (type-check фаза Next.js build).
Затронуто 4 файла: `import-from-file.ts`, `import-from-estimate.ts`, `conduct-movement.ts`, `auto-batch.ts`.
`Prisma.TransactionClient` тоже несовместим — он основан на базовом `PrismaClient`, не на расширенном.
**Правило**: для типа транзакционного клиента Prisma ВСЕГДА использовать `PrismaTx`
из `@/lib/db` — это `Omit<ExtendedPrismaClient, ...>`, совместимый с `$extends`. Никогда не выводить тип
через `Parameters<Parameters<PrismaClient['$transaction']>...>`, `typeof db.$transaction`
или `Prisma.TransactionClient`. В inline-коллбэках `db.$transaction(async (tx) => { ... })`
убирать явную аннотацию типа — TypeScript выведет корректный тип автоматически.

---

**FK-constraint в миграции на таблицу, которую создаёт другая (более поздняя) миграция — P0001/42P01 в проде.**
Ситуация: модели `Currency` и `BudgetType` были добавлены в `schema.prisma` через `db push` в dev-окружении, без создания файла миграции. Затем миграция REF.8 (`20260419010000`) добавила FK-constraint вида `FOREIGN KEY ("currencyId") REFERENCES "currencies"("id")` — но таблица `currencies` не существовала на prod-БД ни в одной из предшествующих миграций. Результат: PostgreSQL ошибка `42P01 relation "currencies" does not exist` → `start.sh` поймал ошибку и пометил миграцию как `--applied` без фактического выполнения SQL → колонки `currencyId`, `contractKindId`, `budgetTypeId` отсутствуют в БД → runtime `P2022: column does not exist`.

Исправление: переписать `20260419010000` — добавить колонки без FK (`IF NOT EXISTS`). Создать `20260419020000` — идемпотентная миграция, которая:
1. Создаёт пропущенные таблицы (`CREATE TABLE IF NOT EXISTS`)
2. Добавляет колонки (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`)
3. Добавляет FK-constraints через `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;`

Правило: **никогда не добавлять FK-constraint в миграцию, если целевая таблица создаётся другой миграцией, которую Prisma не гарантированно применила раньше** — особенно если эта таблица могла существовать только через `db push`. Всегда проверять, что для каждой модели, на которую ссылается новый FK, существует `CREATE TABLE` в одном из предшествующих файлов миграций (`prisma/migrations/*/migration.sql`). Быстрая проверка: `grep -rl "CREATE TABLE.*имя_таблицы" prisma/migrations/`. Если grep пустой — создать отдельную миграцию для таблицы прежде чем добавлять FK.

---

**Не создавать параллельные папки роутинга для одной и той же сущности.**
История: ребрендинг «Проект» → «Объект строительства» привёл к появлению `src/app/(dashboard)/objects/` при сохранении `src/app/(dashboard)/projects/`. Новые модули строились в `objects/`, а реальный контент (`ContractDetailContent`, `GanttContent`, `Ks2DetailContent`, `ExecutionDocDetailContent`, `DefectsContent`, `ProjectsContent`) продолжал жить под `projects/` — в `objects/` были тонкие обёртки вида `export default () => <ContractDetailContent .../>` с `import` из `@/app/(dashboard)/projects/...`. Эта конфигурация нарушает правило «одна каноничная URL на страницу» (`docs/patterns.md`) и создаёт скрытый долг: изменение компонента в одном месте не отражается на другом URL, обёртки забываются при рефакторинге, `router.push` из разных мест указывает на разные пути, `middleware.matcher` должен знать про обе ветки. Отдельно страшно — `objects/.../estimates/[importId]/page.tsx` был server-компонентом с `redirect('/projects/...')`, который после удаления `projects/` превратился бы в 404.
**Решение (2026-04-19)**: вся UI-ветка сведена к одному каноническому корню `/objects/[objectId]/*`. 9 компонентов вынесены в `src/components/modules/*`, 6 реальных страниц перенесены в `objects/`, папка `(dashboard)/projects/` удалена, редиректы `/projects/*` → `/objects/*` повешены в `next.config.mjs` → `redirects()` (HTTP 308), `/projects/:path*` убран из `src/middleware.ts`. API-путь `/api/projects/[projectId]/*` оставлен каноническим — рассинхрон UI↔API осознанный (`projectId` — имя FK в Prisma, переименование сломало бы `$queryRaw`, миграции и `@relation`).
**Правило на будущее**: при ребрендинге или переименовании сущности — **никогда** не добавлять новую route-папку рядом со старой «чтобы пока работало и там, и там». Либо полная миграция за одну PR (включая редиректы в `next.config.mjs` и удаление старой папки), либо откладывание до того момента когда есть ресурс на полный перенос. Параллельные папки накапливают тех. долг квадратично: каждый новый компонент нужно помнить класть «в правую», каждый URL в `router.push` / ссылках — проверять. Быстрая проверка наличия параллельных роут-папок: `find src/app/\(dashboard\) -maxdepth 1 -type d` — сравнить с канонической структурой в `docs/patterns.md`; любое название модели, встречающееся в двух вариантах (`projects`/`objects`, `contractors`/`organizations`, и т.п.) — сигнал к немедленной консолидации.

---

**`ApprovalStepStatus` vs `ApprovalRouteStatus` — путаница двух enum одного модуля.**
Ошибка: `status: 'PENDING'` использовался в фильтре `approvalRoute.steps.some.status`, но `PENDING` — это значение `ApprovalRouteStatus` (уровень маршрута), а не `ApprovalStepStatus` (уровень шага).
`ApprovalRouteStatus`: `PENDING | APPROVED | REJECTED | RESET | PENDING_REMARKS`
`ApprovalStepStatus`: `WAITING | APPROVED | REJECTED`
Результат: `PrismaClientValidationError` в продакшне, вкладка «Требует действия» СЭД ломалась на всех запросах.
**Правило**: при написании `approvalRoute.steps.some { status: '...' }` — всегда проверять `ApprovalStepStatus` в schema.prisma. Шаги согласования ждут через `WAITING`, не `PENDING`. Быстрая проверка: `grep -A5 "enum ApprovalStepStatus" prisma/schema.prisma`.

**TanStack Query: уникальные ключи для одного endpoint = N параллельных запросов.**
После дизайн-рефреша дашборда 8 новых виджетов (`GprMonitoringWidget`, `SkMonitoringWidget`, `DefectStatusWidget`, `FundingPlanWidget`, `ContractsPaymentWidget`, `ContractsPaymentDonutWidget`, `FinancingStatusWidget`, `PaidByProjectWidget`) получили уникальные query keys (`'dashboard-analytics-gpr-monitoring'`, `'dashboard-analytics-sk'` и т.д.) при обращении к одному и тому же endpoint `/api/dashboard/analytics` с одинаковыми параметрами. TanStack Query дедуплицирует только запросы с **одинаковым ключом** — при 8 уникальных ключах в DevTools появилось 10+ параллельных запросов к одному URL, timeline уходил за 80 секунд.
**Правило**: если несколько компонентов читают разные поля из ОДНОГО API-ответа — они ОБЯЗАНЫ использовать ОДИН shared query key. Каждый компонент берёт свои поля из общего кэша. Уникальный key нужен только если endpoint принимает разные параметры (например, `SmrOsvoenoWidget` добавляет `year` → отдельный ключ правомерен).
Быстрая проверка дублирования: `grep -r "queryKey.*dashboard-analytics" src/components/dashboard/` — все entry к одному endpoint должны быть одинаковыми.

---

**Next.js App Router: sidebar `<Link>` без `prefetch={false}` = RSC-лавина при загрузке страницы.**
Каждая видимая ссылка в sidebar (`/inbox`, `/planner`, `/objects`, `/analytics`, `/monitoring`, `/documents`, `/templates`, `/references`) автоматически запрашивала RSC-payload соответствующего маршрута при входе в viewport. При 9 ссылках — 9 параллельных серверных рендеров страниц при загрузке dashboard, DOMContentLoaded растягивался до 30+ секунд. В DevTools это выглядит как дублирующиеся запросы: `analytics` (план `/analytics`), `monitoring` (план `/monitoring`) — без `?_rsc=` суффикса в Name-колонке, что вводит в заблуждение.
**Правило**: в sidebar-навигации (постоянно видимые ссылки) **всегда** ставить `prefetch={false}`. Навигационные ссылки нет смысла префетчить агрессивно — пользователь кликает по одной ссылке, и только тогда нужен маршрут. `prefetch={false}` добавить к `<Link>` в `SidebarNav.tsx`; не распространять на `<Link>` внутри страниц (там автопрефетч полезен). Поиск нарушений: `grep -r "prefetch" src/components/shared/SidebarNav.tsx` — все nav-Links обязаны иметь `prefetch={false}`.

**TanStack Query: разные ключи для одного API-вызова с одинаковыми параметрами = N дублирующихся запросов.**
`IdReadinessWidget` использовал ключ `['dashboard-objects-summary-mini']` и `MapWidget`/`ObjectsBaseWidget` — `['dashboard-objects-summary', objectIds]`. Все трое вызывали `/api/dashboard/objects-summary` без фильтра objectIds. Итог: 2 HTTP-запроса к одному URL вместо 1. Исправлено: `IdReadinessWidget` переведён на `['dashboard-objects-summary', [] as string[]]` — при пустом фильтре ключ совпадает с MapWidget/ObjectsBaseWidget → TanStack Query дедуплицирует до 1 запроса.
**Правило**: перед добавлением нового виджета с `useQuery` — проверить `grep -r "queryKey.*имя-endpoint" src/components/` и убедиться что нет дубликатов. Виджеты к одному endpoint с одинаковыми параметрами должны использовать один ключ. Исключение: если параметры реально разные (например, year в SmrOsvoenoWidget) — отдельный ключ правомерен.

**TODO-комментарий в компоненте как маркер пропущенных полей API — трассировать к `select`/`include` роута.**
`GanttDelegationView.tsx` рендерил `task.delegatedFromOrg ?? '—'` и `task.delegatedToOrg ?? '—'`, всегда показывая прочерки. Рядом был комментарий `{/* TODO: delegatedFromOrg не возвращается API /delegated-tasks */}`. API роут не включал соответствующие relation-поля: у целевой `GanttVersion` есть `delegatedFromOrg` и `delegatedToOrg` через `@relation`, но `select` содержал только `{ id, name }`.
Исправление: добавить в `select` целевых версий:
```typescript
delegatedFromOrg: { select: { name: true } },
delegatedToOrg: { select: { name: true } },
```
и добавить эти строки в маппинг ответа: `delegatedFromOrg: tv?.delegatedFromOrg?.name ?? null`.
**Правило**: TODO-комментарий вида `{/* TODO: field X не возвращается API /endpoint */}` — это технический долг с конкретным адресом. При обнаружении: открыть указанный роут, найти его `select`/`include`, добавить пропущенную relation с нужными полями, удалить TODO. Быстрый поиск таких долгов: `grep -r "не возвращается API" src/components/`.

**`console.*` в standalone-процессах (socket.ts, воркеры) — использовать pino logger, relative import.**
`src/server/socket.ts` использовал `console.error` и `console.log` вместо pino logger. Остальной проект (API роуты, воркеры) уже использует `logger` из `src/lib/logger.ts`. Несогласованность: логи socket-процесса имели другой формат и не попадали в структурированный вывод.
Проблема с импортом: standalone-процессы (`server.js`, `socket.ts`) не могут использовать алиас `@/lib/logger` — tsconfig paths не работают в CJS-окружении без дополнительной конфигурации. Правильный импорт — **относительный**: `import { logger } from '../lib/logger'`.
Замена:
```typescript
// Неправильно:
console.error('[socket] message:send error', err);
console.log(`[socket] running on port ${PORT}`);

// Правильно:
logger.error({ err }, '[socket] message:send error');
logger.info(`[socket] running on port ${PORT}`);
```
**Правило**: при создании нового standalone-процесса или воркера — сразу добавлять `import { logger } from '../lib/logger'` (relative path) и не использовать `console.*`. Поиск нарушений: `grep -r "console\." src/server/ src/lib/workers/`.

---

**`.filter()` не сужает тип для TypeScript в последующем `.map()` — TS2345 при рефакторинге sequential loop → Promise.all.**
Конвертация `for...of` + `if (t.parentId && ...)` в `.filter(t => t.parentId && ...).map(t => ...)` теряет TypeScript-сужение типа.
В `if`-блоке `t.parentId` сужается до `string` (truthy check). В `.map()` после `.filter()` TypeScript видит `t.parentId: string | null` — оригинальный тип без сужения.
`Map.get()` принимает `string`, не `string | null` → TS2345 на деплое (`'null' is not assignable to 'string'`).
Ошибка проявляется только при `next build` (type-check) — локально без `node_modules` молчит.
Исправлено в `gantt/versions/route.ts` добавлением `!` (non-null assertion): `idMap.get(t.parentId!)`.
**Правило**: при конвертации `if (nullable && ...)` → `.filter(t => t.nullable && ...).map(t => fn(t.nullable))` —
**всегда** добавлять `!` к nullable-полю в `.map()`: `t.nullable!`. TypeScript не переносит narrowing из `.filter()` в `.map()`.
Альтернатива: type predicate в фильтре `(t): t is T & { field: string } => !!t.field && ...` — тогда `.map()` получает суженный тип автоматически, но verbose.
Быстрая проверка: `grep -rn "\.filter(.*&&.*\.has\|\.filter(.*!== null\|\.filter(.*!= null" src/ | grep "\.map("` — найти chain-паттерны с потенциальными nullable-ключами.

---

**`uuid` без `@types/uuid` — TS7016 при динамическом импорте транзитивной зависимости.**
`uuid` не был добавлен в `dependencies`/`devDependencies` (`package.json`), но использовался через `await import('uuid')` в `CameraCapture.tsx`. Пакет доступен в `node_modules` как транзитивная зависимость, поэтому локально всё работало, однако TypeScript не находит декларации типов и выдаёт `TS7016: Could not find a declaration file for module 'uuid'` при `next build` (type-check фаза).
Варианты исправления (в порядке предпочтения):
1. Заменить `uuid` на `crypto.randomUUID()` — встроенный WebCrypto API, доступен в Node.js 14.17+ и всех современных браузерах. Не требует импорта и типов. **Используемый подход.**
2. Добавить явную зависимость: `uuid` в `dependencies` + `@types/uuid` в `devDependencies`.
Исправлено в `src/components/mobile/CameraCapture.tsx`: `const { v4: uuidv4 } = await import('uuid'); const clientId = uuidv4()` → `const clientId = crypto.randomUUID()`.
**Правило**: при генерации UUID **всегда** использовать `crypto.randomUUID()`. Не импортировать пакет `uuid` без явной записи в `package.json`. Поиск нарушений: `grep -rn "from 'uuid'\|import('uuid')" src/`.

---

**`label` в `screenshots` манифеста PWA — поле не входит в тип `MetadataRoute.Manifest` Next.js.**
Свойство `label` на объектах в массиве `screenshots` предусмотрено более новой версией спецификации Web App Manifest, но тип `MetadataRoute.Manifest` в установленной версии Next.js его не содержит: `{ src: string; type?: string; sizes?: string }`.
Результат: `Type error: Object literal may only specify known properties, and 'label' does not exist in type ...` на `next build` (type-check фаза).
Ошибка видна только на деплое — локально без `node_modules` TypeScript молчит.
Обнаружено в `src/app/manifest.ts` (3 screenshot-объекта с `label`).
**Правило**: не добавлять `label` в объекты `screenshots` манифеста пока тип Next.js его не поддерживает. Если поле критично — использовать двойной каст всего массива: `screenshots: [...] as unknown as MetadataRoute.Manifest['screenshots']`. При обновлении Next.js проверить добавление `label` обратно.

---

**`SpeechRecognition` как глобальный тип недоступен при `"types": ["@serwist/next/typings"]` + `"webworker"` в `lib` — `Cannot find name 'SpeechRecognition'`.**
Конфигурация `tsconfig.json` с `"types": ["@serwist/next/typings"]` и `"lib": [..., "webworker"]` не резолвит глобальный Web Speech API тип `SpeechRecognition`, несмотря на наличие `"dom"` в `lib`. Локально без `node_modules` ошибка молчит, на деплое (type-check фаза `next build`) — `Type error: Cannot find name 'SpeechRecognition'`.
Обнаружено в `src/components/mobile/VoiceInput.tsx`.
**Правило**: Web Speech API (`SpeechRecognition`, `webkitSpeechRecognition`) и другие нестандартные/экспериментальные Browser API **никогда не использовать как глобальные типы** в проекте с Serwist/PWA. Вместо этого объявлять локальные интерфейсы точно по используемым полям и выносить доступ к `window` через `as unknown as WindowWithSpeech`:
```typescript
interface SpeechRecognitionLike {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
  start(): void; stop(): void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
interface WindowWithSpeech {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}
// Использование:
const win = window as unknown as WindowWithSpeech;
const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
```
Поиск нарушений: `grep -rn "SpeechRecognition\b" src/` — убедиться что глобальное имя не используется нигде как тип без `as unknown as`.

---

**`useSearchParams()` без Suspense — ошибка преренdera при `next build` на статических страницах.**
Next.js App Router требует, чтобы любой компонент, использующий `useSearchParams()`, находился внутри `<Suspense>` boundary. При статической генерации страниц (`Generating static pages`) Next.js пытается отрендерить страницу на сервере — и падает с `useSearchParams() should be wrapped in a suspense boundary at page "/mobile/..."`.
Обнаружено в 3 файлах: `src/app/mobile/defect/page.tsx`, `src/app/mobile/journal/page.tsx`, `src/app/mobile/journal/[journalId]/new/page.tsx`.
Ошибка видна только при `next build` — в dev-режиме (`next dev`) страница работает без ошибок.
**Правило**: любая `page.tsx` с `'use client'` и `useSearchParams()` ОБЯЗАНА оборачивать содержимое в `<Suspense>`. Паттерн — вынести содержимое в `*Content`-компонент, экспортировать page как:
```typescript
export default function Page() {
  return (
    <Suspense>
      <PageContent />
    </Suspense>
  );
}
```
`fallback` для Suspense необязателен — без него Next.js использует ближайший родительский Suspense или пустой фолбэк.
Поиск нарушений: `grep -rn "useSearchParams" src/app/ | grep -v "Suspense"` — не гарантирован (Suspense может быть в другом файле), но выявляет кандидатов для ревью.

**API-роут без `export const dynamic = 'force-dynamic'` — `PrismaClientInitializationError` при `next build`.**
Next.js App Router пытается статически пре-рендерить каждый API-роут без явного `dynamic`-директивы.
В CI/CD-окружении нет БД → Prisma падает с `Can't reach database server at localhost:5432` прямо в фазе `Generating static pages`.
Ошибка видна **только на `next build`** — в dev-режиме (`next dev`) всё работает.
Симптом в логах: `PrismaClientInitializationError` + `Error occurred prerendering page "/api/some-route"`.
Затронуло 14 роутов сразу: `/api/subscription-plans`, `/api/workspaces/*`, `/api/referrals/*`, `/api/admin/referrals`, `/api/cron/*`, `/api/webhooks/yookassa`, `/api/push/*`, `/api/auth/socket-token`.
**Правило**: **каждый** новый API-роут (`src/app/api/**/route.ts`) ОБЯЗАН содержать первой строкой после imports:
```typescript
export const dynamic = 'force-dynamic';
```
Исключения — только роуты, которые явно должны быть статическими (нет обращений к БД, сессии, внешним API).
Поиск нарушений перед деплоем:
```bash
grep -rL "force-dynamic\|force-static\|revalidate" src/app/api/ --include="route.ts"
```
Все найденные файлы с обращениями к `db.*`, `getServerSession`, `headers()`, `cookies()` — добавить `force-dynamic`.

---

**N+1 уведомлений в cron/роутах — `db.notification.create()` в цикле → `createMany()` + отдельный queue loop.**
Паттерн `for (const item of items) { await db.notification.create({...}); await enqueueNotification({...}); }` создаёт N последовательных round-trip к БД. В cron-джобах с малым объёмом незаметно, в user-triggered роутах (task-templates/instantiate, tasks/reports) — ощутимо при 10–50 участниках проекта.
Зафиксировано в: `cron/prescription-deadline/route.ts`, `cron/inspection-reminder/route.ts`, `task-templates/[id]/instantiate/route.ts`, `tasks/[id]/reports/route.ts`.
**Правило**: при рассылке уведомлений нескольким получателям всегда использовать паттерн «collect → batch»:
```typescript
const toCreate: NotificationData[] = [];
const toEnqueue: QueuePayload[] = [];
for (const recipient of recipients) {
  toCreate.push({ userId: recipient.id, type, title, body, ... });
  toEnqueue.push({ userId: recipient.id, email: recipient.email, ... });
}
await db.notification.createMany({ data: toCreate });
for (const item of toEnqueue) await enqueueNotification(item);
```
Для cron-джобов с idempotency-флагом — дополнительно `updateMany` вместо per-item `update`:
```typescript
await db.specialJournalEntry.updateMany({ where: { id: { in: notifiedIds } }, data: { inspectionNotificationSent: true } });
```
Поиск нарушений: `grep -rn "notification\.create(" src/app/api/ | grep -v "createMany"`.

**Wildcard CORS в Python-сервисах и S3-бакете — подменить на configurable whitelist.**
Два независимых места с `allow_origins=["*"]` / `AllowedOrigins: ['*']`:
1. `services/ifc-service/main.py` — FastAPI CORSMiddleware: любой сайт может делать кросс-доменные запросы к IFC-сервису из браузера пользователя.
2. `stroydocs/src/app/api/admin/setup-s3/route.ts` — S3 bucket CORS policy: wildcard разрешает DELETE/PUT к бакету с любого origin.
**Правило**:
- Python-сервисы: читать `CORS_ALLOWED_ORIGINS` из env (comma-separated), default — только localhost. Для прод задавать через docker-compose: `CORS_ALLOWED_ORIGINS=${APP_URL:-http://localhost:3000}`.
- S3 CORS: `AllowedOrigins: [process.env.APP_URL ?? 'https://app.stroydocs.ru']` — браузерные запросы только с домена приложения.
Исправлено: IFC-сервис читает `CORS_ALLOWED_ORIGINS`; setup-s3 использует `APP_URL`.

---

**`next/font/google` падает в Docker build с `Failed to fetch Inter/JetBrains Mono from Google Fonts` — сетевой запрос в фазе webpack-компиляции.**
`next/font/google` (Inter, JetBrains Mono) скачивает шрифты с `fonts.googleapis.com` во время `npm run build` (webpack-компиляция), а не при `npm install`. В Docker BuildKit (Docker Desktop, CI) исходящий трафик к Google заблокирован — сборка падает с `webpack errors`.
Это нарушает и ФЗ-152: каждый browser hit к Google Fonts может считаться передачей IP-адреса (ПДн) зарубежному сервису.
**Правило**: `next/font/google` запрещён в проекте. Всегда использовать `next/font/local`.
Стратегия получения файлов без коммита бинарников в git:
1. Установить `@fontsource-variable/inter` и `@fontsource/jetbrains-mono` как npm-зависимости.
2. Создать скрипт `scripts/copy-fonts.mjs` — копирует woff2 из `node_modules/@fontsource*/files/` в `public/fonts/`.
3. Добавить `"prebuild": "node scripts/copy-fonts.mjs"` в `package.json` — запускается автоматически перед `next build`.
4. Добавить `public/fonts/` в `.gitignore`.
5. В `layout.tsx` использовать `localFont({ src: [...], variable: '--font-*' })`.
Это гарантирует: шрифты доступны при любом `npm run build` (CI, Docker, локально), нет запросов к Google во время сборки и рантайма, соответствие ФЗ-152.
Поиск нарушений: `grep -rn "from 'next/font/google'" src/` — должно быть пустым.
Зафиксировано в `src/app/layout.tsx`, `package.json`, `scripts/copy-fonts.mjs`.

---

**`start.sh` помечает ЛЮБУЮ ошибку `migrate deploy` как applied — маскирует реальные сбои зависимостей.**

Симптом продакшна: в логах `P3018: A migration failed to apply ... ERROR: type "SubscriptionStatus" does not exist` (код 42704), `ERROR: type "ProfessionalRole" does not exist` (42704), `ERROR: relation "workspaces" does not exist` (42P01) — пять миграций подряд падают, но `start.sh` каждую помечает как `--applied` с сообщением «таблица уже существует (db push)». `migrate deploy` финиширует «успешно», контейнер стартует. При первом же запросе NextAuth падает с `P2022: column users.activeWorkspaceId does not exist` — колонка не создана, потому что SQL миграции не выполнился.

**Причина каскада**:
1. `20260421010000_add_subscriptions_payments` содержит `ALTER TABLE "workspaces"` на строке 99, но таблица `workspaces` создаётся позже в `#060000`. PostgreSQL откатывает **всю транзакцию** миграции → enums `PlanType`/`ProfessionalRole`/`SubscriptionStatus` и таблицы subscription/payments не создаются.
2. Все последующие рескью-миграции (`#060000`, `#22000000`, `#23000000`) содержат одинаковый битый DO-блок:
   ```sql
   DO $$ BEGIN
     ALTER TABLE "users" ADD COLUMN "professionalRole" "ProfessionalRole";
   EXCEPTION WHEN duplicate_column THEN NULL; END $$;
   ```
   `EXCEPTION` ловит только `duplicate_column` (42701), но бросается `undefined_object` (42704 — enum не существует) → вся миграция откатывается.
3. `#22020000` имеет `ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS` — `IF NOT EXISTS` относится к **колонке**, не к **таблице**. Если таблицы нет → 42P01.
4. `start.sh` на каждый error без разбора делал `migrate resolve --applied` — получалось «миграция учтена», но SQL не выполнен.

**Корневой баг в `scripts/start.sh`** (было):
```sh
if ! node prisma migrate deploy; then
  FAILED=$(node scripts/find-failed-migration.js)
  echo "[migrate] Миграция $FAILED: таблица уже существует (db push), помечаем as applied..."
  node prisma migrate resolve --applied "$FAILED"
fi
```
Скрипт **не различает коды ошибок Postgres**: benign (объект уже есть) vs. блокирующие (зависимость отсутствует).

**Правило 1 — фильтровать коды ошибок в `start.sh`**:
```sh
CODE=$(grep -oE 'Database error code: [0-9A-Z]+' "$MIGRATE_LOG" | head -1 | awk '{print $NF}')
case "$CODE" in
  42P07|42701|42710|42723)
    # benign: table/column/object/function already exists (типичный db push)
    node prisma migrate resolve --applied "$FAILED"
    ;;
  *)
    # 42704 (type not found), 42P01 (relation not found), FK violations и т.д.
    # НЕ маскировать. Halt с явной диагностикой.
    echo "КРИТИЧЕСКАЯ ОШИБКА $CODE в $FAILED — halt."
    exit 1
    ;;
esac
```

**Правило 2 — в DO-блоке `ALTER TABLE ADD COLUMN "enum_type"` ловить ДВА исключения**:
```sql
DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "professionalRole" "ProfessionalRole";
EXCEPTION
  WHEN duplicate_column THEN NULL;   -- колонка уже есть
  WHEN undefined_object THEN NULL;   -- enum ещё не создан (цепочка битая)
END $$;
```
Только `duplicate_column` — гарантированная бомба замедленного действия: однажды upstream-миграция откатится, и вся rescue-цепочка пойдёт под нож.

**Правило 3 — проверять и ENUM-типы в `check-migration-integrity.js`**:
Таблицы могут существовать (из более ранних успешных миграций или `db push`), а enums — отсутствовать (если откатилась миграция, создававшая их). Проверять через `pg_type WHERE typname = $1 AND typtype = 'e'`. Минимум: `ProfessionalRole`, `SubscriptionStatus`, `PlanType`, `WorkspaceType`, `WorkspaceRole`.

**Правило 4 — никогда не использовать `IF NOT EXISTS` как защиту от отсутствия таблицы**:
`ALTER TABLE "T" ADD COLUMN IF NOT EXISTS "c"` — `IF NOT EXISTS` проверяет только колонку. Если таблицы `T` нет, получаем 42P01. Защита от отсутствия таблицы — только через `DO $$ ... EXCEPTION WHEN undefined_table`.

**Правило 5 — `ALTER TABLE` на таблицу из ПОЗДНЕЙ миграции оборачивать в undefined_table**:
Если миграция A ссылается на таблицу, которая создаётся в миграции B, и лексикографически A < B — на свежей БД порядок применения такой, что B ещё не было, A упадёт. Правильно: все `ALTER TABLE "T"` где `T` — из поздней миграции, защищать `DO $$ BEGIN ... EXCEPTION WHEN undefined_table THEN NULL; END $$;`.

**Правило 6 — в `start.sh` различать транзиентные и блокирующие ошибки**:
После первого деплоя с правильной фильтрацией SQL-кодов выяснилось: Prisma может упасть с `P1001: Can't reach database server` — это **НЕ** сбой миграции, это **потеря соединения** с Timeweb Managed PostgreSQL (обычно 1–30 сек). Такие ошибки (P1001/P1008/P1017) **нельзя** ни помечать applied, ни halt — нужно ретраить с backoff. Также `find-failed-migration.js` делает запрос к БД; если БД недоступна, его exit-1 — это тоже транзиент, не блокер.
```sh
# Сначала проверить Prisma-код (транзиенты):
PRISMA_CODE=$(grep -oE 'P1[0-9]{3}' "$MIGRATE_LOG" | head -1)
case "$PRISMA_CODE" in
  P1001|P1008|P1017)
    # БД недоступна/таймаут — ретрай, не меняя _prisma_migrations
    sleep $((transient_attempts * 2))  # backoff до 30s
    continue
    ;;
esac
# И только потом проверять PG_CODE (42XXX) для SQL-уровня.
```
Ретраев на транзиент — 6 штук (суммарно ~62 сек с backoff 2/4/8/16/30/30), после — halt.

**Правило 7 — миграции без первичного CREATE-объекта (RENAME/ALTER/DROP) на не-пустой БД помечать applied**:
После TRUNCATE `_prisma_migrations` все миграции запускаются заново. Не-идемпотентные операции типа `ALTER TABLE "projects" RENAME TO "building_objects"` падают с 42P01, если таблица уже переименована на этой БД (через `db push` или прошлый старый start.sh). Без `bulk-mark-stale-migrations.js` поддержки таких миграций каждый TRUNCATE-цикл будет ронять деплой.
Логика `bulk-mark`: если `extractPrimaryObject(sql)` вернул `null` (миграция целиком из RENAME/ALTER/DROP, без CREATE TABLE/CREATE TYPE/ADD COLUMN), И в БД уже есть applied-миграции либо ключевая таблица `users` — пометить её applied. Это безопасно: на пустой БД `dbHasContent === false` → миграция запустится нормально; на не-пустой БД она по факту уже применена (и/или таблица была создана через db push сразу под целевым именем).
Параллельно: каждая такая миграция должна быть и сама по себе идемпотентной — `RENAME TO` оборачивать в `DO $$ BEGIN ... EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$`. Двойная защита: сама миграция терпима к повторному запуску + `bulk-mark` пропускает её на не-пустой БД.

Быстрая проверка нарушений:
```bash
# DO-блоки с enum-типом без undefined_object:
grep -rA3 "ADD COLUMN .*\"[A-Z]" stroydocs/prisma/migrations/ | \
  grep -B3 "EXCEPTION WHEN duplicate_column THEN NULL" | grep -v undefined_object

# start.sh, который помечает applied без разбора кода ошибки:
grep -n "migrate resolve --applied" stroydocs/scripts/start.sh
```

**Post-mortem**: единая строка catch-all в `start.sh` создаёт иллюзию надёжности — деплой всегда «зелёный», но проверка целостности (`check-migration-integrity.js`) могла быть неполной (не проверять все нужные колонки/enums). Когда оба безопасника дают ложный «OK», баг проходит в прод. Защита: три независимых уровня (правильный `EXCEPTION` в DO-блоках, правильная фильтрация в `start.sh`, полная проверка ключевых объектов в `check-migration-integrity.js`). Ни один слой не должен доверять, что остальные сработали.

Зафиксировано в: `stroydocs/scripts/start.sh`, `stroydocs/scripts/check-migration-integrity.js`, миграции `20260421010000`, `20260421060000`, `20260422000000`, `20260422020000`, `20260423000000`, + финальная рескью `20260424000000_global_subscription_workspace_recovery`.

---

**`features: {}` вместо `features: []` в Prisma JSON поле — `TypeError: .includes is not a function` в клиентских компонентах.**
`start-trial/route.ts` автоматически создавал резервный план с `features: {}` (JSON-объект). Клиентские хуки `useFeatureAccess` и `use-feature` читали это поле через `(data?.plan?.features as string[]) ?? []`. Оператор `??` срабатывает только на `null` и `undefined`, но не на `{}` (пустой объект — truthy). В итоге `features` получал значение `{}`, и вызов `{}.includes(feature)` бросал `TypeError: .includes is not a function`, пойманный ErrorBoundary.
**Исправление**:
1. В месте создания — `features: []` (массив, не объект).
2. В хуках — `Array.isArray(data?.plan?.features) ? data.plan.features as string[] : []` вместо `?? []`.
**Правило**: Prisma JSON-поле (`Json`) может вернуть любой тип — объект, массив, null, примитив. Оператор `?? []` защищает только от `null`/`undefined`. Для полей, которые должны быть массивами, **всегда** использовать `Array.isArray()`:
```typescript
// Неправильно — {}  не null, ?? [] не срабатывает:
const features = (data?.plan?.features as string[]) ?? [];

// Правильно:
const features = Array.isArray(data?.plan?.features) ? data.plan.features as string[] : [];
```
Поиск нарушений: `grep -rn "as string\[\]) ??" src/` — все совпадения на Prisma Json-полях переписать на `Array.isArray`.
Дополнительно: при `upsert`/`create` Prisma Json-полей хранящих массивы — явно указывать `[]`, не `{}`.

**Service Worker `SecurityError: script resource is behind a redirect` — middleware перехватывает `/sw.js` и `/swe-worker-*.js`.**
Serwist (форк Workbox) генерирует два файла у корня домена: `sw.js` (основной SW) и `swe-worker-<hash>.js` (entry-воркер с динамическим именем). Если эти файлы попадают в auth middleware — браузер получает HTML redirect вместо JavaScript и бросает `SecurityError` / `SyntaxError: Unexpected token '<'`.
**Правило**: в `PUBLIC_PATHS` middleware добавить `/sw.js`, `/swe-worker-` (префикс — динамический hash) и `/manifest.webmanifest`. В `config.matcher` добавить `sw\\.js` и `swe-worker-.*\\.js` в negative lookahead — двойная защита:
```typescript
const PUBLIC_PATHS = [
  '/sw.js',
  '/swe-worker-',          // Serwist worker entry (swe-worker-<hash>.js)
  '/manifest.webmanifest',
  '/~offline',
];
export const config = {
  matcher: ['/((?!_next/static|...|sw\\.js|swe-worker-.*\\.js|workbox-.*\\.js).*)',],
};
```
Поиск нарушений: `grep -n "PUBLIC_PATHS" src/middleware.ts` — убедиться что `/swe-worker-` есть в списке.

---

**Отсутствующая `}` в конце модели Prisma → P1012 "This line is not a valid field or attribute definition" на всех следующих конструкциях.**
Модель `AiComplianceIssue` заканчивалась на `@@map("ai_compliance_issues")` без закрывающей `}`. Prisma-парсер воспринимал все значения следующего `enum HiddenWorkType { ... }` как поля незакрытой модели — отсюда 9 ошибок «This field declaration is invalid».
Ошибка видна только при `prisma generate` (Docker build, CI, `npm run build`) — IDE может не подсвечивать при отсутствии Prisma language server.
Причина: при написании конца блока моделей с `@@map()` легко пропустить `}`, особенно если следующая строка — комментарий нового модуля, а не следующая модель.
**Правило**: после каждого `@@map(...)` в Prisma-схеме убедиться что **следующая непустая строка** — `}`. Быстрая проверка баланса скобок:
```bash
python3 -c "
content = open('prisma/schema.prisma').read()
opens = content.count('{'); closes = content.count('}')
print(f'Opens: {opens}, Closes: {closes}, Delta: {opens - closes}')
"
# Delta должна быть 0
```

---

**`opengraph-image.tsx` с `export async function GET(...)` — "Duplicate export 'GET'" при `next build`.**
Next.js App Router обрабатывает `opengraph-image.tsx` через `next-metadata-route-loader`, который **автоматически генерирует** `GET` экспорт из файла. Если в файле явно объявлен `export async function GET(...)` — возникает конфликт дублирующихся экспортов → webpack ошибка `Module parse failed: Duplicate export 'GET'` → `Build failed because of webpack errors`.
Ошибка специфична для имён файлов `opengraph-image.tsx` и `twitter-image.tsx` — обычные route.ts этим не затрагиваются.
**Правило**: файлы `opengraph-image.tsx` / `twitter-image.tsx` в App Router **никогда** не экспортируют `GET` напрямую. Правильный паттерн — `export default async function Image({ params })`:
```typescript
// Правильно:
export default async function Image({ params }: { params: { token: string } }) {
  return new ImageResponse(...)
}

// Неправильно — дублирует GET который Next.js генерирует сам:
export async function GET(request: NextRequest, { params }: ...) {
  return new ImageResponse(...)
}
```
Дополнительные экспорты для метаданных: `export const alt`, `export const size`, `export const contentType` — допустимы.
Поиск нарушений: `grep -rn "export async function GET" src/app/ | grep "opengraph-image\|twitter-image"`.

---

> Правило: после каждой исправленной ошибки добавить урок сюда.
> Команда: "Добавь урок в docs/lessons.md: [описание ошибки]"
