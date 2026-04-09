# lessons.md — Накопленные уроки

> Обновлять после каждой исправленной ошибки. Этот файл — живой.
> Формат: **Что случилось** → **Почему** → **Правило на будущее**

---

## Prisma / База данных

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

**Два идентичных enum (`DesignTaskStatus` + `DesignDocStatus`) — сигнал о дублировании.**
Задания и документы движутся по одному workflow, но получили разные enum.
При следующем рефакторинге — единый `PIRWorkflowStatus` с `type`-дискриминатором.
Это уменьшит количество state-machine файлов и упростит ApprovalRoute интеграцию.

---

## TypeScript / ESLint

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

---

## Среда разработки / CI

**`npx tsc --noEmit` и `npx eslint` не работают без node_modules.**
В окружении без установленных зависимостей (`npm install` не запускался):
— `tsc` выдаёт сотни `TS2307: Cannot find module` — всё это инфраструктурные ошибки, не баги кода.
— `npx eslint` подхватывает глобальную версию (v10+), которая не поддерживает `.eslintrc.json` (v8 формат).
Оба инструмента дают false-positive только из-за отсутствия `node_modules`.
Правило: перед верификацией проверять что `node_modules/` существует.
Команды должны запускаться через локальный бинарник: `./node_modules/.bin/tsc --noEmit`.

---

> Правило: после каждой исправленной ошибки добавить урок сюда.
> Команда: "Добавь урок в docs/lessons.md: [описание ошибки]"
