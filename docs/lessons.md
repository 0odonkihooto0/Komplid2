# lessons.md — Накопленные уроки

> Обновлять после каждой исправленной ошибки. Этот файл — живой.
> Формат: **Что случилось** → **Почему** → **Правило на будущее**

---

## Prisma / База данных

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

**`Array.entries()` в `for...of` без `Array.from()` — ошибка при target < ES2015.**
`for (const [i, v] of arr.entries())` вызывает TS-ошибку
`Type 'IterableIterator' can only be iterated through when using '--downlevelIteration'`.
Правило (аналогично `[...new Set(...)]`): **всегда** оборачивать в `Array.from()`:
`for (const [i, v] of Array.from(arr.entries()))`.
Относится к любым методам возвращающим `IterableIterator`: `.entries()`, `.keys()`, `.values()`.

---

## React / Next.js

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
API `/api/objects/[objectId]/defects/[defectId]` включает `normativeRefs` через `include`.
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

---

> Правило: после каждой исправленной ошибки добавить урок сюда.
> Команда: "Добавь урок в docs/lessons.md: [описание ошибки]"
