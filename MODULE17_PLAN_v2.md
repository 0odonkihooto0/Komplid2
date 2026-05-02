# MODULE17_PLAN_v2.md — Портал заказчика и killer-фичи (модернизированная версия)

> **Версия:** 2.0 — модернизация v1 после полного аудита репозитория
> **Дата:** 2026-05-01
> **Репозиторий:** `stroydocs/` (основное приложение, `app.komplid.ru`)
> **Что нового по сравнению с v1:**
> - Учёт **реально существующих** моделей: `BuildingObject` (не Project!), `WorkspaceMember`, `ProjectPortalToken`, `Defect`, `Photo`, `ExecutionDoc`, `Inspection`, `SpecialJournal`
> - Учёт **уже реализованных** компонентов: `/portal/[token]`, `/shared/journal/[token]`, `/docs/verify/[token]`
> - Учёт критических архитектурных правил из `docs/lessons.md`: **`projectId` менять нельзя**, путь API только `/api/projects/[projectId]/*` (не `/api/objects/`)
> - Использование **уже работающей** инфраструктуры: BullMQ, Yandex Cloud SDK, Timeweb S3, Telegram-чат через Socket.io, Web Speech API + Yandex SpeechKit
> - Удаление дублей с тем, что уже есть в Модулях 10, 11, 16

---

# 0. Что показал аудит репозитория

## 0.1. Уже реализовано в коде (НЕ дублировать в MODULE17)

| Сущность v1-плана | Реальное состояние в репо | Решение |
|---|---|---|
| `ProjectPortalToken` | ✅ Существует: `prisma/schema.prisma`, поля `id, token, expiresAt, projectId, createdById` | Расширяем, не создаём заново |
| `/shared/project/[token]` | ✅ Уже есть `/portal/[token]/page.tsx` + `/api/portal/[token]/route.ts` (агрегация по projectId, 410 при истечении) | Расширяем существующий, **не создаём новый маршрут** |
| `/docs/verify/[token]` | ✅ Существует, публичная без auth, проверка QR ИД через qrToken | Не трогаем, переиспользуем для KF-2 (портфолио) |
| `/shared/journal/[token]` | ✅ Существует — публичный шеринг ОЖР для Прораб→ПТО передачи | Учитываем как пример паттерна |
| `WorkspaceRole.GUEST` | ✅ В enum'е есть (как и OWNER, ADMIN, MEMBER, GUEST) | **GUEST уже есть, добавляем CUSTOMER** |
| `WorkspaceMember.guestScope: Json?` | ✅ Поле существует | Только типизируем |
| QR + публичная верификация ИД | ✅ Полностью реализовано в Модуле 10 (`/contracts/[contractId]/execution-docs/[docId]/qr`, `/qr-stamp`) | **Не дублировать**, переиспользовать |
| QR + публичная верификация ПИР | ✅ Уже есть `/design-docs/[docId]/qr` | Не трогать |
| Photo с GPS | ✅ Полностью реализовано: `Photo` модель (s3Key, gpsLat, gpsLng, takenAt, category) + `POST /api/photos` с pre-signed URL | Используем как есть |
| Defect (замечания) | ✅ Полностью реализовано в Модуле 11: модель + API + UI + DefectTemplate (системные шаблоны) | **KF-5 (биржа дефектов) строится поверх существующего Defect** |
| AI-инфраструктура | ✅ YandexGPT интегрирован (парсинг смет): `src/lib/estimates/yandex-gpt.ts` + `gemini.ts` (fallback) | Переиспользуем для KF-1 (AI-проверка ИД) |
| OCR | ⬜ Yandex Vision API — **только в плане** (`docs/stack.md`: "Фаза позже"), не реализован | KF-3 разрабатывается с нуля |
| Telegram-бот | ⬜ Не реализован, упомянут в `портал заказчика и клиента.docx` как «топ-1 альтернативная фича» | **Добавляем как KF-6** (1 неделя, низкая стоимость) |
| Web Speech API | ✅ Реализован в Модуле 16 (`VoiceInput` + Yandex SpeechKit fallback) | Переиспользуем в KF-1 для голосового ввода вопросов AI-юристу |
| BullMQ + Redis | ✅ Полная инфраструктура с rate-limiting на error events (см. `docs/lessons.md`) | Используем для AI/OCR воркеров |
| Subscriptions / FeatureGate | ✅ Полностью реализован Модуль 15 Фаза 2 — `SubscriptionPlan`, `Subscription`, `requireFeature`, `<FeatureGate>`, `useFeature`, `PaywallBanner`, `getActivePlan` (с Free fallback) | **Используем эти именно эти примитивы**, не изобретаем PaywallGate v2 |
| Реферальная система | ✅ Полностью реализован Модуль 16 — `ReferralCode`, `Referral`, `WorkspaceCredit`, `/ref/[code]` cookie 30 дней, начисления при первой оплате | Используем как есть для виральности портала |
| PWA / offline / геозоны | ✅ Полностью реализован Модуль 16: Serwist SW, IndexedDB, sync-queue, push (VAPID), `CameraCapture`, `SignWithGps`, `lib/geofencing/distance.ts` | Гостевой кабинет должен работать в PWA «из коробки» |

## 0.2. Критические правила из `docs/lessons.md`

Это решения, которые в v1-плане могли быть нарушены. **Не нарушать ни при каких обстоятельствах:**

1. **Имя FK — `projectId`, не `objectId`.** В Prisma все ссылки на `BuildingObject` идут через `projectId String` + `buildingObject BuildingObject @relation(fields: [projectId], ...)`. Несмотря на UI-URL `/objects/[objectId]/*`, API только `/api/projects/[projectId]/*`. Переименование сломает `$queryRaw`, миграции и десятки `@relation`-полей.

2. **Главная сущность объекта — `BuildingObject`** (а не `Project`). В v1-плане я постоянно писал `model Project`, в реальности нужно `model BuildingObject` или работать через расширения существующей модели.

3. **`WorkspaceRole` enum**: реально содержит `OWNER | ADMIN | MEMBER | GUEST` (не FOREMAN/ENGINEER/MANAGER, как в моём v1-плане). Это намеренно: `MEMBER` — обобщённая роль, конкретика — через `User.position` и через специализированные роли в `Defect`/`Inspection`/`Task`.

4. **ioredis error handler — обязательно с rate-limiting** (max 1 раз в 30 секунд). Без этого логи захлёбываются при недоступности Redis.

5. **Socket.io — отдельный процесс на порту 3001.** Не запускать в Next.js API Route. Это критично для KF-6 (Telegram-бот) — он не должен пытаться использовать Socket.io напрямую, используем BullMQ.

6. **Канонический путь API — только `/api/projects/[projectId]/*`.** Параллельный путь `/api/objects/[objectId]/*` — наследие миграции, исключён.

7. **`organizationId` фильтрация в каждом API.** Проверить через `session.user.organizationId` — это паттерн всего приложения. Сейчас идёт миграция на `workspaceId` (Модуль 15 Фаза 1), но в KF-фичах надо проверять оба для совместимости.

## 0.3. Что в v1-плане было неправильно или избыточно

| Проблема в v1 | Что было | Что должно быть |
|---|---|---|
| Дублировал `ProjectPortalToken.scopeType` enum | Создавал заново | Реально надо только добавить новые поля: `allowIndexing`, `viewCount`, `customSettings`, `revokedAt` к существующей модели |
| Создавал маршрут `/shared/project/[token]` | Как новый | Маршрут уже существует — `/portal/[token]/page.tsx`. Расширяем его |
| Изобретал «новые» роли FOREMAN, ENGINEER, MANAGER | Расширял enum | В реальности `WorkspaceRole = OWNER\|ADMIN\|MEMBER\|GUEST`. Конкретные специализации — через `User.position` и через `WorkspaceMember.role`. Добавляем только `CUSTOMER` |
| Создавал свой `requirePermission` / matrix | Дублировал MODULE15 | Используем `requireFeature` + `getActivePlan` из MODULE15. Permissions matrix не нужна — используем существующую `featureCodes` логику |
| Создавал OCR-инфраструктуру с нуля | Yandex Vision клиент, парсеры | Yandex Cloud SDK уже подключён (для GPT). Vision — отдельный SDK, но IAM/folder и шаблон вызова уже есть |
| Игнорировал, что Defect уже полностью реализован | KF-5 описывал «биржу дефектов» как новую модель | KF-5 — это просто новая модель `DefectExchangeListing` поверх существующего `Defect`. UI-кнопка «Передать на биржу» добавляется в карточку существующего дефекта |
| Переоценил время на гостевой кабинет | 4 недели | 2 недели — поскольку GUEST роль и guestScope уже есть, нужен только UI и SMS-подпись |

## 0.4. Что не учитывал v1, а нужно учесть

1. **`BuildingObject.publicShareToken` уже используется в Модуле 6** (для смет) и **в Модуле 9** (для журналов). Не путать с `ProjectPortalToken` — это разные сущности с разной семантикой:
   - `ProjectPortalToken` — единый токен на проект, агрегатный портал заказчика
   - `EstimateVersion.publicShareToken` — токен на конкретную версию сметы (с режимом VIEW/COMPARE)
   - `SpecialJournal.publicShareToken` — токен на конкретный журнал (передача Прораб→ПТО)

2. **Модуль 4 уже создаёт `/management/contracts`, `/management/documents`, `/management/events`, `/management/analytics`** — это значит фронт `/customer/...` для будущей B2C-фазы должен быть в отдельном route group, чтобы не конфликтовать.

3. **`CustomerProject` из v1 — лишняя абстракция.** В реальности достаточно `BuildingObject` с новой ролью OWNER в `WorkspaceMember`. Все B2C-фичи (чек-листы, AI-юрист, претензии) можно прицепить к обычному `BuildingObject`. Просто Workspace будет PERSONAL (см. Модуль 15) с одним участником.

4. **`HiddenWorksChecklist` из v1 близок к существующему `DefectTemplate`** (в нём уже есть title, description, category, normativeRef, requirements, isSystem). Можно переиспользовать архитектуру: создать `ChecklistTemplate` как двойник, а позже унифицировать.

5. **AI-юрист (`/customer/ai-lawyer`) из v1 дублирует архитектуру парсинга смет.** Используем тот же паттерн: `src/lib/ai/lawyer.ts` (с YandexGPT + Gemini fallback), оборачиваем в `requireFeature(FEATURES.AI_LAWYER)`, лимит через FeatureGate.

---

# 0.5. Карта фаз (модернизированная)

```
┌────────────────────────────────────────────────────────────────────────┐
│ БЛОК A — ПОРТАЛ ЗАКАЗЧИКА (опираясь на /portal/[token])               │
├────────────────────────────────────────────────────────────────────────┤
│ Фаза 1  │ Расширение публичного дашборда      │ 1.5 нед │ СЕЙЧАС       │
│ Фаза 2  │ Гостевой кабинет (GUEST UI)         │ 2 нед   │ после 50 PS  │
│ Фаза 3  │ B2C "Мой Ремонт" (PERSONAL ws)      │ 4 нед   │ через 3-6 м  │
├────────────────────────────────────────────────────────────────────────┤
│ БЛОК B — KILLER-ФИЧИ                                                  │
├────────────────────────────────────────────────────────────────────────┤
│ KF-1    │ AI-проверка комплектности ИД        │ 2 нед   │ параллельно  │
│ KF-2    │ Публичное портфолио подрядчика      │ 1 нед   │ с Фазой 1    │
│ KF-3    │ OCR сканов актов (Yandex Vision)    │ 3 нед   │ параллельно  │
│ KF-4    │ Маркетплейс субподрядчиков          │ 4 нед   │ после 1000+  │
│ KF-5    │ Биржа дефектов (поверх Defect)      │ 2 нед   │ вместе с KF4 │
│ KF-6    │ Telegram-бот для прораба            │ 1 нед   │ ВЫСОКИЙ ROI  │
└────────────────────────────────────────────────────────────────────────┘
```

**Изменения по сравнению с v1:**
- Фаза 1: 2 нед → **1.5 нед** (т.к. `/portal/[token]` уже существует)
- Фаза 2: 4 нед → **2 нед** (GUEST + guestScope уже в схеме)
- Фаза 3: 6 нед → **4 нед** (используем PERSONAL Workspace из MODULE15, не изобретаем `CustomerProject`)
- KF-5: 3 нед → **2 нед** (поверх существующего Defect)
- **Добавлен KF-6: Telegram-бот** — упомянут в источнике как топ-1 идея с самым высоким ROI, не было в v1

**Общий бюджет:** 13.5 недель (было 14 в v1, но с большим объёмом)


---

# ЧАСТЬ I — ПОРТАЛ ЗАКАЗЧИКА

# ФАЗА 1 — Расширение публичного дашборда (1.5 недели)

## 1.0. Контекст (что уже работает)

**Существующие файлы:**
- `prisma/schema.prisma` — модель `ProjectPortalToken { id, token, expiresAt, projectId, createdById, createdAt }`
- `src/app/portal/[token]/page.tsx` — публичная страница (без auth), отображает: круговой прогресс, паспорт объекта, статистику ИД (signed/total), последние 5 критических Defect, последние 10 фото
- `src/app/api/portal/[token]/route.ts` — публичный GET, проверяет `expiresAt > now()`, возвращает 410 если истёк
- `src/app/api/projects/[projectId]/portal-token/route.ts` — GET/POST/DELETE для управления токеном (требует organizationId match)

**Что добавляем в Фазе 1:**
1. Расширение `ProjectPortalToken` — новые поля для фильтрации, аналитики и SEO
2. Новые API: фотогалерея с пагинацией, временной ряд прогресса, аналитика просмотров
3. Расширение UI `/portal/[token]` — настройки видимости, lightbox-галерея, промо-блок
4. Новая страница `/objects/[objectId]/management/publicity` — управление публичностью
5. SEO: динамические OpenGraph-картинки, Schema.org, robots-meta

**Что явно НЕ делаем в Фазе 1:**
- Авторизация заказчика (это Фаза 2)
- Денежные суммы на публичной странице (по умолчанию скрыты)
- Индексация активных объектов в поисковиках (только завершённых, и только если владелец явно разрешил)

---

## 1.1. Изменения в Prisma-схеме

```
📋 ЗАДАЧА: Расширить ProjectPortalToken для полноценного дашборда

📁 ФАЙЛ: prisma/schema.prisma

ШАГ 1. Добавить enum PortalTokenScope:

enum PortalTokenScope {
  PROJECT_DASHBOARD     // дефолт — текущая семантика
  CONTRACTOR_PORTFOLIO  // KF-2 — портфолио подрядчика
  CUSTOMER_GUEST        // Фаза 2 — гостевой кабинет
}

ШАГ 2. Расширить ProjectPortalToken (НЕ переименовывать существующие поля):

model ProjectPortalToken {
  id        String    @id @default(uuid())
  token     String    @unique @default(uuid())
  expiresAt DateTime?

  projectId      String
  buildingObject BuildingObject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  createdById String
  createdBy   User   @relation(fields: [createdById], references: [id])

  // НОВЫЕ ПОЛЯ
  scopeType        PortalTokenScope @default(PROJECT_DASHBOARD)
  allowIndexing    Boolean          @default(false)
  viewCount        Int              @default(0)
  lastViewedAt     DateTime?
  customSettings   Json?            // { hideCosts, hidePhotoIds, hideAddress, ... }
  revokedAt        DateTime?
  revokedReason    String?
  revokedById      String?
  revokedBy        User?            @relation("PortalTokenRevoker", fields: [revokedById], references: [id])

  views            PortalView[]
  createdAt DateTime @default(now())

  @@index([projectId])
  @@index([scopeType, projectId])
  @@map("project_portal_tokens")
}

ШАГ 3. Новая модель PortalView (для аналитики):

model PortalView {
  id            String   @id @default(uuid())
  tokenId       String
  token         ProjectPortalToken @relation(fields: [tokenId], references: [id], onDelete: Cascade)
  viewedAt      DateTime @default(now())
  ipHash        String   // sha256(ip + daily_salt) — для GDPR/152-ФЗ
  userAgent     String?
  referer       String?
  countryCode   String?  @db.VarChar(2)

  @@index([tokenId, viewedAt])
  @@map("portal_views")
}

ШАГ 4. Расширить BuildingObject:

model BuildingObject {
  // ... существующие поля
  publicDashboardEnabled  Boolean  @default(false)
  publicDashboardSettings Json?
}

ШАГ 5. В User добавить обратную relation:
revokedPortalTokens ProjectPortalToken[] @relation("PortalTokenRevoker")

КОМАНДА:
npx prisma migrate dev --name extend_portal_token_for_dashboard
npx prisma generate
```

---

## 1.2. API-эндпоинты Фазы 1

```
📋 ЗАДАЧА: Расширить и добавить эндпоинты

📁 ФАЙЛЫ:
- src/app/api/projects/[projectId]/portal-token/route.ts (РАСШИРИТЬ)
- src/app/api/projects/[projectId]/publicity/route.ts (НОВЫЙ)
- src/app/api/portal/[token]/route.ts (РАСШИРИТЬ — добавить customSettings)
- src/app/api/portal/[token]/view/route.ts (НОВЫЙ)
- src/app/api/portal/[token]/photos/route.ts (НОВЫЙ)
- src/app/api/portal/[token]/progress/route.ts (НОВЫЙ)
- src/app/api/portal/[token]/timeline/route.ts (НОВЫЙ)
- src/app/api/projects/[projectId]/publicity/analytics/route.ts (НОВЫЙ)

СПЕЦИФИКАЦИЯ:

1) POST /api/projects/[projectId]/publicity
   Auth: getSessionOrThrow + organizationId check + role в [OWNER, ADMIN]
   Body (zod): {
     enabled: boolean,
     hideCosts?: boolean (default true),
     hidePhotoIds?: string[],
     hideAddress?: boolean,
     hideDefects?: boolean,
     onlyCompletedStages?: boolean,
     expiresInDays?: number | null,
     allowIndexing?: boolean
   }
   Логика:
   - При enabled=true: создать или вернуть существующий PROJECT_DASHBOARD-токен,
     обновить customSettings, обновить BuildingObject.publicDashboardEnabled
   - При enabled=false: пометить revokedAt
   Return: { token, publicUrl: `${APP_URL}/portal/${token}` }

2) GET /api/portal/[token] (РАСШИРИТЬ существующий)
   Дополнительно к текущему ответу:
   - Проверить customSettings и фильтровать данные:
     * hideCosts → не возвращать ks2Acts суммы, totalAmount
     * hideDefects → criticalDefects: []
     * hidePhotoIds → отфильтровать из recentPhotos
     * hideAddress → возвращать только city, не полный адрес
   - НЕ инкрементировать viewCount здесь (отдельный POST)
   - Проверить revokedAt → 410 Gone
   - Проверить scopeType === PROJECT_DASHBOARD

3) POST /api/portal/[token]/view
   Без auth, public.
   - Инкрементирует viewCount, обновляет lastViewedAt
   - Создаёт PortalView с ipHash (sha256 от IP + daily salt)
   - Rate-limit: 1 view на token + ipHash в 5 минут (anti-spam)
   - Использовать существующий rate-limit middleware если есть, иначе in-memory Map

4) GET /api/portal/[token]/photos?limit=20&cursor=
   Cursor-based пагинация по Photo.createdAt DESC
   Фильтры:
   - author.organizationId === project.organizationId (как в существующем коде)
   - id NOT IN customSettings.hidePhotoIds
   - category !== 'VIOLATION' (если customSettings.hideDefects=true) [используем существующий enum PhotoCategory]
   Return: { items: [{ id, downloadUrl, takenAt, gpsLat, gpsLng }], nextCursor }
   Использовать getDownloadUrl из @/lib/s3-utils (уже есть)

5) GET /api/portal/[token]/progress
   Возвращает временной ряд прогресса:
   - По датам подписания ExecutionDoc (status=SIGNED) — кумулятивный график
   - Если есть GanttVersion (Модуль 7) — план vs факт
   Return: {
     points: [{ date, signedDocs, percent }],
     milestones: [{ date, title, type }] — закрытые этапы
   }

6) GET /api/portal/[token]/timeline
   Лента событий: новые подписанные акты, завершённые этапы, ключевые фото-вехи
   Return: { events: [{ date, type, title, description, link? }] }

7) GET /api/projects/[projectId]/publicity/analytics
   Auth: organizationId + role
   Return: {
     viewCount: number,
     uniqueVisitors: number,  // count distinct ipHash
     viewsByDay: [{ date, count }],
     topReferers: [{ referer, count }],
     topCountries: [{ countryCode, count }]
   }

ВАЖНО:
- Все /api/portal/* — без auth, без CORS-ограничений (но rate-limit обязателен)
- IP hash: sha256(ip + daily_salt), salt меняется раз в день — это GDPR/152-ФЗ совместимо
- Country code: использовать существующий middleware если есть (geo lookup), иначе пропускать
```

---

## 1.3. UI публичной страницы — расширение `/portal/[token]`

```
📋 ЗАДАЧА: Расширить существующую страницу /portal/[token]

📁 ФАЙЛЫ:
- src/app/portal/[token]/page.tsx (РАСШИРИТЬ существующий)
- src/components/portal/ProjectHero.tsx (НОВЫЙ — выделить из page.tsx)
- src/components/portal/ProgressOverview.tsx (НОВЫЙ)
- src/components/portal/PhotoGallery.tsx (НОВЫЙ — с lightbox)
- src/components/portal/EventsTimeline.tsx (НОВЫЙ)
- src/components/portal/VerifiedDocumentsBadge.tsx (НОВЫЙ)
- src/components/portal/PromoBlock.tsx (НОВЫЙ)
- src/app/portal/[token]/opengraph-image.tsx (НОВЫЙ — динамический OG)

СУЩЕСТВУЮЩАЯ СТРАНИЦА уже содержит:
- Хедер с лого "StroyDocs" — заменить на "Komplid" если уже переименовано в маркетинге
- Карточка проекта с круговым прогрессом
- Статистика ИД (signed/total)
- Список критических дефектов (5 шт)
- Сетка фото (10 шт)
- Тосты "Не нашли" / "Срок истёк"

ЧТО ДОБАВЛЯЕМ:

<ExtendedPortalPage>
  <ProjectHero>  // существующий блок, выносим в компонент
    + добавить: статус ("В работе" / "Завершён"), период работ
    + кнопка "Подписан Х актов" → линк на /portal/[token]/documents
  </ProjectHero>

  <ProgressOverview>  // НОВЫЙ
    График прогресса по неделям (Recharts AreaChart, уже в проекте)
    Кнопка "Подробнее" → /portal/[token]/progress
  </ProgressOverview>

  <PhotoGallery>  // НОВЫЙ
    Сетка 4×N с infinite scroll (intersection observer)
    Lightbox через shadcn/ui Dialog (уже в проекте)
    Группировка по дате
    EXIF скрыт
    GPS показывается опционально (зависит от customSettings)
    Кнопка "Хочу так же → app.komplid.ru"
  </PhotoGallery>

  <EventsTimeline>  // НОВЫЙ
    Вертикальный timeline (lucide иконки + Tailwind)
    Подгружает /api/portal/[token]/timeline
  </EventsTimeline>

  <VerifiedDocumentsBadge>  // НОВЫЙ
    Счётчик: "Подписано X актов скрытых работ"
    Если < 5 актов — показать QR-коды на каждый
    Каждый QR — линк на существующий /docs/verify/[qrToken]
  </VerifiedDocumentsBadge>

  <PromoBlock>  // НОВЫЙ
    "Хотите вести свою стройку так же прозрачно?"
    CTA: "Попробовать Komplid → app.komplid.ru/signup?utm_source=portal"
    НЕ показывать если referer содержит komplid.ru или app.komplid.ru
  </PromoBlock>
</ExtendedPortalPage>

ТРЕБОВАНИЯ К SEO:
- generateMetadata():
  * <title>Объект "{name}" — прогресс строительства | Komplid</title>
  * <meta description> с краткой сводкой
  * canonical URL
  * robots: "noindex,nofollow" если allowIndexing=false
            "index,follow" если allowIndexing=true И статус=COMPLETED
- OpenGraph через src/app/portal/[token]/opengraph-image.tsx
  * Использовать @vercel/og (уже в Next.js 14)
  * Берёт первое фото проекта + оверлей с названием + логотип Komplid
- Schema.org через react-schemaorg или просто <script type="application/ld+json">:
  {
    "@context": "https://schema.org",
    "@type": "ConstructionProject",
    "name": project.name,
    "address": project.address,
    "startDate": project.startDate,
    "endDate": project.endDate,
    "status": status
  }

CLIENT-SIDE:
- Использовать TanStack Query (уже в проекте) для подгрузки фото с пагинацией
- POST /portal/[token]/view вызывать из useEffect один раз при монтировании
- localStorage не использовать (SSR safety)
```

---

## 1.4. UI управления публичностью

```
📋 ЗАДАЧА: Создать страницу настроек публичности в существующем модуле

📁 ФАЙЛЫ:
- src/app/(dashboard)/objects/[objectId]/management/publicity/page.tsx (НОВЫЙ)
- src/components/objects/management/PublicitySettings.tsx (НОВЫЙ)
- src/components/objects/management/PublicityAnalytics.tsx (НОВЫЙ)

ВАЖНО: Помещаем в /management/ потому что Модуль 4 уже создал этот раздел
с вкладками contracts/documents/events/analytics. Добавляем 5-ю вкладку "Публичность".

СТРУКТУРА:

<PublicitySettings>
  <EnableToggle>
    "Разрешить публичный доступ к объекту"
    При первом включении — создать PortalToken
    При выключении — soft-revoke (revokedAt)
  </EnableToggle>

  <PublicUrlCard if="enabled">
    URL: app.komplid.ru/portal/{token}
    Кнопки:
    - "Копировать ссылку"
    - "Открыть в новой вкладке"
    - "Скачать QR-код" (использовать существующий QRCode lib из QR ИД)
    - "Поделиться в Telegram/WhatsApp" (Web Share API + fallback)
  </PublicUrlCard>

  <VisibilitySettings>
    Чекбоксы (записываются в customSettings):
    ☑ Скрыть суммы договора и смет (по умолчанию ON — безопаснее)
    ☐ Скрыть имена прорабов и заказчиков
    ☐ Показывать только город (без полного адреса)
    ☐ Скрыть дефекты с категорией "VIOLATION"
    ☐ Показывать только завершённые этапы
    ☐ Разрешить индексацию поисковиками (доступно только если статус=COMPLETED)
  </VisibilitySettings>

  <SelectivePhotoHiding>
    Сетка всех фото проекта (с пагинацией)
    Каждое фото — toggle "Не показывать публично"
    Изменения сохраняются в customSettings.hidePhotoIds
  </SelectivePhotoHiding>

  <ExpirySettings>
    RadioGroup:
    ◉ Бессрочно
    ○ 30 дней
    ○ 90 дней
    ○ До конца проекта (если есть plannedEndDate)
    ○ Конкретная дата (DatePicker)
  </ExpirySettings>

  <PreviewButton>
    "Открыть превью" → новая вкладка /portal/{token}?preview=true
    На превью добавляется badge "Так это видит заказчик"
  </PreviewButton>

  <PublicityAnalytics>
    Виджеты:
    - Просмотры за 7/30 дней (Recharts BarChart)
    - Уникальные посетители
    - Топ источники (по referer)
    - Топ страны (по countryCode)
  </PublicityAnalytics>

  <RevokeButton variant="destructive">
    "Отозвать ссылку"
    AlertDialog с подтверждением + поле "Причина отзыва"
  </RevokeButton>
</PublicitySettings>

ROLE CHECK:
- Видят: WorkspaceMember с role IN [OWNER, ADMIN]
- Остальные: 403

ИНТЕГРАЦИЯ В НАВИГАЦИЮ:
- Добавить пункт "Публичность" в layout.tsx модуля /management/
  (уже есть: Контракты, Документы, Мероприятия, Аналитика)
```

---

## 1.5. Команды для Claude Code — Фаза 1

```bash
# Команда 1. Prisma-миграция
cd stroydocs
# Применить изменения из 1.1
npx prisma migrate dev --name extend_portal_token_for_dashboard
npx prisma generate

# Команда 2. Расширение существующих API
# - Дописать GET /api/portal/[token] — фильтрация по customSettings
# - Создать 6 новых API из спецификации 1.2

# Команда 3. UI publicity
# Создать страницу /objects/[objectId]/management/publicity
# Обновить layout.tsx модуля /management/ — добавить пункт "Публичность"
# Создать 3 компонента из 1.4

# Команда 4. Расширение публичной страницы
# - Рефактор /portal/[token]/page.tsx — выделить компоненты
# - Создать 6 новых компонентов из 1.3
# - Добавить opengraph-image.tsx для динамического OG

# Команда 5. SEO
# - generateMetadata() с robots-meta
# - Schema.org JSON-LD скрипт
# - sitemap.ts (если уже есть в проекте) — добавлять только токены с
#   allowIndexing=true и status=COMPLETED

# Команда 6. Rate-limit для public API
# Если в проекте есть src/lib/rate-limit/ — использовать
# Иначе — простейший in-memory или Redis-based limiter
# Лимит: 60 req/мин/IP для GET /api/portal/[token]/*

# Команда 7. TypeScript + тесты
npx tsc --noEmit
npm test -- --testPathPattern=portal
# E2E (если есть Playwright):
# - Открыть портал в инкогнито → видеть данные
# - Включить hideCosts → суммы исчезают
# - Revoke → видеть 410
```

**ACCEPTANCE CRITERIA Фазы 1:**

- [ ] OWNER/ADMIN может включить/отключить публичность из /management/publicity
- [ ] Публичная ссылка `/portal/[token]` открывается в инкогнито без auth
- [ ] customSettings корректно фильтрует данные (cost, address, photos)
- [ ] PortalView создаётся при просмотре, ipHash рассчитывается с daily salt
- [ ] viewCount + lastViewedAt обновляются
- [ ] Revoke ссылки → 410 + страница ошибки
- [ ] QR-коды на документах ИД открывают существующий `/docs/verify/[qrToken]`
- [ ] Lighthouse > 90 на /portal/[token]
- [ ] OG-картинка генерируется через @vercel/og
- [ ] Schema.org валидируется через Rich Results Test
- [ ] robots-meta правильная: `noindex` для активных, `index` для completed (если allowIndexing)
- [ ] Rate-limit на /api/portal/* работает (60 req/мин/IP)
- [ ] Аналитика отображается в /management/publicity

---


# ФАЗА 2 — Гостевой кабинет (2 недели)

## 2.0. Контекст (что уже работает)

**Существующее в коде:**
- `WorkspaceRole` enum содержит `GUEST` (Модуль 15)
- `WorkspaceMember.guestScope: Json?` поле существует
- Приглашения через email уже работают (`Invitation` модель + accept-flow)
- PWA-инфраструктура полностью готова (Модуль 16): SW, IDB, push, GPS
- SMS-провайдер: **в репозитории НЕ обнаружен**, нужно добавить (либо подключаем sms.ru / smsc.ru / smsaero, либо полагаемся только на email-confirm)

**Что добавляем в Фазе 2:**
1. Новые модели: `GuestInvitation`, `GuestComment`, `GuestSignature` (для отдельной семантики гостевых приглашений)
2. Типизация `guestScope` через TypeScript-тип (Zod)
3. Новый layout `/guest/*` (отдельный от `/objects/*`)
4. SMS-подпись актов (если SMS-провайдер подключён) или email-confirm
5. Расширение middleware: GUEST → редирект на /guest

**Что НЕ переделываем:**
- Auth flow (NextAuth остаётся как есть)
- Notification модель (используем существующую)

---

## 2.1. Изменения в Prisma-схеме

```
📋 ЗАДАЧА: Модели для гостевых приглашений и подписей

📁 ФАЙЛ: prisma/schema.prisma

ШАГ 1. Типизация guestScope (в TypeScript, не в Prisma):

📁 src/types/guest-scope.ts:

import { z } from 'zod';

export const guestScopeSchema = z.object({
  scope: z.enum(['FULL', 'CONTRACT_ONLY']),
  contractId: z.string().uuid().optional(),
  allowedProjectIds: z.array(z.string().uuid()),
  permissions: z.object({
    canViewPhotos: z.boolean().default(true),
    canViewDocuments: z.boolean().default(true),
    canComment: z.boolean().default(true),
    canSignActs: z.boolean().default(false),
    canViewCosts: z.boolean().default(false),
  }),
  signatureMethod: z.enum(['SMS', 'EMAIL_CONFIRM', 'SIMPLE_ECP', 'NONE']).default('EMAIL_CONFIRM'),
});

export type GuestScope = z.infer<typeof guestScopeSchema>;

ШАГ 2. Модели в schema.prisma:

model GuestInvitation {
  id             String   @id @default(uuid())
  workspaceId    String
  workspace      Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  // Опциональная привязка к проекту/контракту
  projectId      String?
  buildingObject BuildingObject? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  contractId     String?
  contract       Contract? @relation(fields: [contractId], references: [id], onDelete: SetNull)

  // Контактные данные приглашаемого
  email          String?
  phone          String?
  fullName       String

  scope          Json     // GuestScope
  token          String   @unique @default(uuid())
  status         GuestInvitationStatus @default(PENDING)
  sentAt         DateTime @default(now())
  acceptedAt     DateTime?
  expiresAt      DateTime
  createdById    String
  creator        User     @relation("GuestInvitationCreator", fields: [createdById], references: [id])

  @@index([workspaceId, status])
  @@index([token])
  @@index([projectId])
  @@map("guest_invitations")
}

enum GuestInvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}

model GuestComment {
  id           String   @id @default(uuid())
  workspaceId  String
  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  projectId    String
  buildingObject BuildingObject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  authorUserId String
  author       User     @relation("GuestCommentAuthor", fields: [authorUserId], references: [id])
  targetType   GuestCommentTarget
  targetId     String   // id Photo / ExecutionDoc / Defect / Estimate
  content      String
  status       GuestCommentStatus @default(OPEN)
  resolvedById String?
  resolvedBy   User?    @relation("GuestCommentResolver", fields: [resolvedById], references: [id])
  resolvedAt   DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([projectId, status])
  @@index([targetType, targetId])
  @@map("guest_comments")
}

enum GuestCommentTarget {
  PHOTO
  EXECUTION_DOC
  DEFECT
  ESTIMATE
  STAGE
  GENERAL
}

enum GuestCommentStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  DISMISSED
}

model GuestSignature {
  id              String   @id @default(uuid())
  workspaceId     String
  workspace       Workspace @relation(fields: [workspaceId], references: [id])

  executionDocId  String
  executionDoc    ExecutionDoc @relation(fields: [executionDocId], references: [id], onDelete: Cascade)

  signerUserId    String
  signer          User     @relation("GuestSignatureSigner", fields: [signerUserId], references: [id])

  method          GuestSignatureMethod
  confirmationCode String?
  confirmationCodeHash String?
  confirmationExpiresAt DateTime?
  confirmedAt     DateTime?
  ipAddress       String
  userAgent       String
  gpsLat          Float?       // если есть, аналогично существующей Signature
  gpsLng          Float?
  auditTrail      Json         // полный журнал действий
  status          GuestSignatureStatus @default(PENDING)
  createdAt       DateTime @default(now())

  @@index([executionDocId])
  @@index([signerUserId])
  @@map("guest_signatures")
}

enum GuestSignatureMethod {
  SMS
  EMAIL_CONFIRM
  SIMPLE_ECP
}

enum GuestSignatureStatus {
  PENDING
  CONFIRMED
  REJECTED
  EXPIRED
}

ШАГ 3. Связи:

В User:
guestInvitationsSent GuestInvitation[]   @relation("GuestInvitationCreator")
guestComments        GuestComment[]      @relation("GuestCommentAuthor")
guestCommentsResolved GuestComment[]     @relation("GuestCommentResolver")
guestSignatures      GuestSignature[]    @relation("GuestSignatureSigner")

В Workspace, BuildingObject, Contract, ExecutionDoc — добавить обратные relations.

КОМАНДА:
npx prisma migrate dev --name guest_portal_models
npx prisma generate
```

---

## 2.2. API-эндпоинты Фазы 2

```
📋 ЗАДАЧА: API для гостевого кабинета

📁 ФАЙЛЫ:
- src/app/api/workspaces/[wsId]/guests/invitations/route.ts (GET list, POST)
- src/app/api/workspaces/[wsId]/guests/invitations/[invId]/route.ts (DELETE - revoke)
- src/app/api/public/guest-accept/[token]/route.ts (GET, POST)
- src/app/api/guest/me/route.ts (GET — данные текущего гостя)
- src/app/api/guest/projects/route.ts (GET — мои объекты)
- src/app/api/guest/projects/[projectId]/route.ts (GET — детали)
- src/app/api/guest/projects/[projectId]/photos/route.ts (GET)
- src/app/api/guest/projects/[projectId]/documents/route.ts (GET)
- src/app/api/guest/projects/[projectId]/comments/route.ts (GET, POST)
- src/app/api/guest/comments/[commentId]/route.ts (PATCH — для автора)
- src/app/api/guest/execution-docs/[docId]/sign/route.ts (POST — инициировать подпись)
- src/app/api/guest/signatures/[sigId]/confirm/route.ts (POST — подтвердить кодом)

КЛЮЧЕВАЯ СПЕЦИФИКАЦИЯ:

1) POST /api/workspaces/[wsId]/guests/invitations
   Auth: WorkspaceMember с role IN [OWNER, ADMIN]
   Body (zod):
     fullName: z.string().min(2),
     email: z.string().email().optional(),
     phone: z.string().regex(/^\+?\d{10,15}$/).optional(),
     projectId?: z.string().uuid(),
     contractId?: z.string().uuid(),
     scope: guestScopeSchema,
     expiresInDays: z.number().int().min(1).max(365).default(30),
   Refine: либо email, либо phone обязателен.

   Логика:
   - Создать GuestInvitation
   - Если есть email — отправить через существующий sendTransactional (SMTP уже настроен)
   - Если есть phone — попытаться через SMS-провайдер (если подключён)
     если нет — записать в логи warning, но не падать
   - Email/SMS содержит ссылку: ${APP_URL}/accept-guest/${token}

2) GET /api/public/guest-accept/[token]
   Без auth. Возвращает данные о приглашении для формы:
   - workspaceName, projectName, inviterName
   - scope.permissions (для отображения "Что вам будет доступно")
   - expiresAt
   - hasAccount: проверка существует ли User с таким email/phone

3) POST /api/public/guest-accept/[token]
   Без auth.
   Body:
     password?: z.string().min(8) (если новый юзер),
     acceptEula: z.literal(true)
   Логика (в транзакции):
   - Проверить invitation не EXPIRED, не REVOKED
   - Если hasAccount=true → найти существующего User
     → создать WorkspaceMember(role=GUEST, guestScope из invitation.scope)
   - Иначе → создать новый User (organizationId передаётся через приглашение)
     → создать WorkspaceMember
   - Обновить invitation.acceptedAt
   - Создать сессию (NextAuth signIn)
   Return: { redirectTo: '/guest', userId }

4) POST /api/guest/execution-docs/[docId]/sign
   Auth: GUEST с canSignActs в guestScope.permissions
   Body: { method: GuestSignatureMethod }

   Для SMS:
   - Сгенерировать код 6 цифр (crypto.randomInt(100000, 999999))
   - Хранить только хэш (bcrypt) с TTL 10 минут
   - Отправить SMS через провайдер
   - Вернуть { signatureId, expiresIn: 600 }

   Для EMAIL_CONFIRM:
   - Сгенерировать токен (uuid)
   - Сохранить в confirmationCode
   - Отправить ссылку ${APP_URL}/guest/signatures/${sigId}/confirm?token=${token}
   - При клике — автоконфирм

5) POST /api/guest/signatures/[sigId]/confirm
   Auth: GUEST (тот же signer)
   Body: { code: string }
   - Проверить confirmationExpiresAt > now()
   - Сравнить bcrypt(code) с confirmationCodeHash
   - Если ОК:
     * status = CONFIRMED, confirmedAt = now()
     * Создать запись в существующей Signature модели (с signatureType=SIMPLE)
       — это интегрирует подпись в существующий workflow ИД
     * Обновить ExecutionDoc.status if needed
     * Уведомить создателя проекта через существующую Notification систему
   Return: { signature, executionDoc }

   Audit trail обязательно:
   {
     events: [
       { ts, action: 'requested', method: 'SMS', ipAddress, userAgent },
       { ts, action: 'code_sent', recipient: '+7***1234' },
       { ts, action: 'code_attempt', success: false },
       { ts, action: 'code_attempt', success: true },
       { ts, action: 'confirmed' }
     ]
   }

ВАЖНО:
- Все /api/guest/* требуют сессии с активным WorkspaceMember.role === GUEST
- Доступ к проектам проверять через guestScope.allowedProjectIds
- Не позволять GUEST вызывать /api/projects/* напрямую
  (это уже работает, потому что requireOrganizationId блокирует)
- При попытке action не из guestScope.permissions → 403
```

---

## 2.3. UI гостевого кабинета

```
📋 ЗАДАЧА: Отдельный layout и страницы для GUEST-роли

📁 ФАЙЛЫ:
- src/middleware.ts (РАСШИРИТЬ)
- src/app/(guest)/layout.tsx (НОВЫЙ — отдельная route group)
- src/app/(guest)/guest/page.tsx (дашборд)
- src/app/(guest)/guest/projects/[projectId]/page.tsx
- src/app/(guest)/guest/projects/[projectId]/photos/page.tsx
- src/app/(guest)/guest/projects/[projectId]/documents/page.tsx
- src/app/(guest)/guest/projects/[projectId]/comments/page.tsx
- src/app/(guest)/guest/signatures/page.tsx (история подписей + pending)
- src/app/accept-guest/[token]/page.tsx (НЕ внутри (guest) group — ещё не залогинен)
- src/components/guest/* (10+ компонентов)

ROUTE GROUP (guest):
- Изолирован от (dashboard) layout — у GUEST нет ObjectModuleSidebar
- Свой собственный header с переключателем компании (если в нескольких)

MIDDLEWARE:

📁 src/middleware.ts (РАСШИРИТЬ существующий):

import { withAuth } from 'next-auth/middleware';

export default withAuth(
  async function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (!token) return; // допустим уже обрабатывается

    // Получить роль активного workspace
    // ВАЖНО: брать из session (расширенный jwt callback в lib/auth.ts)
    const isGuest = token.activeRole === 'GUEST';

    if (isGuest && !pathname.startsWith('/guest') && !pathname.startsWith('/api/guest')) {
      return NextResponse.redirect(new URL('/guest', req.url));
    }

    if (!isGuest && pathname.startsWith('/guest')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  },
  // ...
);

ВАЖНО: jwt callback в src/lib/auth.ts должен подгружать activeRole из
WorkspaceMember для активного workspace. Если этого ещё нет — добавить.

СТРУКТУРА LAYOUT:

<GuestLayout>
  <GuestHeader>
    Лого Komplid (более компактное)
    "Вы в кабинете подрядчика «{workspaceName}»"
    Переключатель компаний (если у юзера >1 GUEST workspace)
    Колокольчик уведомлений (использует существующую Notification)
    Меню профиль / выйти
  </GuestHeader>

  <main>{children}</main>

  <GuestFooter>
    "Этот кабинет предоставлен подрядчиком через Komplid"
    "Хотите свой кабинет подрядчика? → app.komplid.ru/signup"
    (Промо НЕ показывать если referer = app.komplid.ru)
  </GuestFooter>
</GuestLayout>

ДАШБОРД (/guest):

<GuestDashboard>
  <WelcomeCard name={user.firstName} />

  <PendingActions>
    Если есть GuestSignature.status=PENDING → CTA "Подпишите акт"
    Если есть GuestComment ответы → CTA "Прочитайте ответ"
  </PendingActions>

  <MyProjects>
    Карточки проектов из guestScope.allowedProjectIds
    На каждой:
    - Cover photo (Photo с category=CONFIRMING, последнее)
    - Название, статус
    - Прогресс % (из существующего расчёта signed/total)
  </MyProjects>

  <RecentUpdates>
    Лента событий за 7 дней:
    - Новые фото (из Photo)
    - Подписанные акты (ExecutionDoc.status changed → SIGNED)
    - Ответы на ваши комментарии (GuestComment с resolvedBy)
  </RecentUpdates>
</GuestDashboard>

СТРАНИЦА ПРОЕКТА /guest/projects/[projectId]:

<GuestProjectPage>
  <ProjectHero>
    (переиспользуем компонент из Фазы 1 /portal/[token])
  </ProjectHero>

  <Tabs>
    <Tab value="photos">Фото</Tab>
    <Tab value="documents">Документы</Tab>
    {permissions.canComment && <Tab value="comments">Комментарии</Tab>}
    {permissions.canSignActs && <Tab value="signatures">Подписи</Tab>}
    {permissions.canViewCosts && <Tab value="estimates">Сметы</Tab>}
  </Tabs>

  <TabContent>
    Каждая вкладка → свой компонент, проверяет permissions из useGuestSession
  </TabContent>
</GuestProjectPage>

ПОДПИСЬ ДОКУМЕНТА:

<SignDocumentWizard>
  Step 1: Просмотр PDF
    Использовать существующий PdfViewer (уже в проекте — react-pdf)
    Чекбокс "Я ознакомлен с документом"

  Step 2: Выбор метода (если phone есть → SMS дефолт)
    RadioGroup: SMS / Email / Простой ЭЦП

  Step 3: Подтверждение
    Поле ввода 6-значного кода
    Таймер "Отправить повторно через X сек"
    При успехе → toast + переход на /guest/signatures
</SignDocumentWizard>

КОМПОНЕНТЫ (в src/components/guest/):
- GuestHeader.tsx
- GuestDashboard.tsx
- PendingActionsCard.tsx
- MyProjectsGrid.tsx
- RecentUpdatesFeed.tsx
- GuestProjectTabs.tsx
- GuestPhotoGallery.tsx (использует тот же PhotoGallery из Фазы 1)
- GuestDocumentsTable.tsx
- GuestCommentsThread.tsx
- SignDocumentWizard.tsx
- AcceptInvitationForm.tsx (для /accept-guest/[token])
- useGuestSession.ts (хук — возвращает scope, permissions, allowedProjectIds)
```

---

## 2.4. Уведомления гостям

```
📋 ЗАДАЧА: Email и Push-уведомления для гостей

📁 ФАЙЛЫ:
- src/lib/notifications/guest.ts (НОВЫЙ)
- src/emails/guest/* (5 шаблонов через React Email или handlebars)

СЦЕНАРИИ (отправка через существующую BullMQ + notification.worker.ts):

1) Новое фото в проекте → email + push (если PWA подписан)
   Триггер: после создания Photo с category=CONFIRMING
   Отложенный запуск через 1 час (батчинг — не спамить за каждое фото)

2) Документ на подпись → email + SMS (если canSignActs)
   Триггер: при создании GuestSignature.status=PENDING
   Срочное (не батчится)

3) Ответ на ваш комментарий → email
   Триггер: при resolvedBy update в GuestComment
   Батч за 1 час

4) Новый этап завершён → email
   Триггер: ExecutionDoc.status -> SIGNED
   Дайджест раз в день в 19:00

5) Срок договора приближается → email
   За 7 и за 1 день до plannedEndDate
   Cron job (BullMQ scheduler)

ИСПОЛЬЗОВАТЬ:
- Существующий sendTransactional() из @/lib/email
- Существующий sendPushToUser из @/lib/push (Модуль 16)
- Notification модель — дублировать в БД для in-app колокольчика

НАСТРОЙКИ /guest/settings/notifications:
- Гость может отключить любой канал
- НЕ может отключить "Документ на подпись" (критично)
```

---

## 2.5. Команды для Claude Code — Фаза 2

```bash
# Команда 1. Миграция
npx prisma migrate dev --name guest_portal_models
npx prisma generate

# Команда 2. SMS-провайдер
# Если ещё нет src/lib/sms/ — подключить sms.ru или smsc.ru
# Базовый интерфейс sendSms(phone, text)
# Добавить env переменные SMS_PROVIDER, SMS_API_KEY, SMS_SENDER

# Команда 3. API
# Создать 11 файлов из 2.2

# Команда 4. Middleware расширение
# Обновить src/middleware.ts + src/lib/auth.ts (jwt callback)
# Добавить session.user.activeRole

# Команда 5. UI
# Создать route group (guest) + layout
# 7 страниц + 11 компонентов из 2.3

# Команда 6. Email-шаблоны
# 5 шаблонов в src/emails/guest/
# Использовать существующую инфраструктуру (если React Email — то .tsx,
# иначе handlebars аналогично других уведомлений)

# Команда 7. Backfill
# Скрипт scripts/backfill-guest-scope.ts:
# Для существующих WorkspaceMember с role=GUEST — заполнить
# дефолтный guestScope { permissions: { canViewPhotos: true, canComment: true }}

# Команда 8. Тесты
npx tsc --noEmit
# E2E: invite → accept → login → sign act
```

**ACCEPTANCE CRITERIA Фазы 2:**

- [ ] OWNER/ADMIN может пригласить гостя по email или phone
- [ ] Email доходит, ссылка открывает форму принятия
- [ ] SMS доходит (если провайдер подключён) или fallback на email
- [ ] После accept — гость видит только свои проекты
- [ ] GUEST редиректится на /guest при попытке открыть /dashboard
- [ ] GUEST получает 403 при прямом запросе /api/projects/[id] вне scope
- [ ] Комментарии работают (CRUD), не позволяют редактировать данные
- [ ] SMS-подпись акта работает: код приходит, подтверждение засчитывается
- [ ] Подпись попадает в существующую Signature таблицу — интегрируется с workflow
- [ ] Audit trail сохраняется в GuestSignature.auditTrail
- [ ] Уведомления приходят (email + push)
- [ ] Revoke гостевого доступа OWNER-ом → сессия гостя терминируется
- [ ] PWA работает для GUEST (используется существующая инфраструктура Модуля 16)

---


# ФАЗА 3 — B2C «Мой Ремонт» (4 недели)

## 3.0. Контекст и ключевое архитектурное решение

**Главное упрощение по сравнению с v1:** не создаём отдельную модель `CustomerProject`. Вместо этого:

- B2C-заказчик регистрируется → создаётся `Workspace(type=PERSONAL)` (механизм уже работает в Модуле 15 Фаза 1)
- Создаёт обычный `BuildingObject` в этом workspace
- Получает план `customer_pro` (новый план в существующей `SubscriptionPlan` таблице)
- Использует **те же** компоненты что и B2B-подрядчик (фото, документы, комментарии), но в упрощённом B2C-shell

**Что добавляем НОВОГО:**
1. Новый план `customer_pro` в SubscriptionPlan + новые feature codes
2. Новые модели: `HiddenWorksChecklist` (поверх `DefectTemplate` паттерна), `CustomerPayment`, `CustomerMaterial`, `CustomerClaim`
3. AI-юрист — обёртка над YandexGPT (используем существующую инфраструктуру)
4. Шаблоны претензий (контент в src/content/, не БД)
5. Новый layout `/moy-remont/*` — упрощённый B2C-shell
6. Новый профессиональный пакет в Модуле 15: `CUSTOMER` (как четвёртая роль)

**Что НЕ дублируем:**
- BuildingObject — используем существующий
- Photo, Document — используем существующие
- Workspace + Subscription — используем механизм из Модуля 15

---

## 3.1. Расширение SubscriptionPlan и FEATURES

```
📋 ЗАДАЧА: Добавить план customer_pro и новые feature-коды

📁 ФАЙЛЫ:
- src/lib/subscriptions/features.ts (РАСШИРИТЬ существующий)
- prisma/seeds/subscription-plans.ts (РАСШИРИТЬ)

ШАГ 1. В features.ts добавить:

export const FEATURES = {
  // ... существующие
  CUSTOMER_HIDDEN_WORKS_CHECKLISTS: 'customer_hidden_works_checklists',
  CUSTOMER_AI_LAWYER: 'customer_ai_lawyer',
  CUSTOMER_CLAIM_TEMPLATES: 'customer_claim_templates',
  CUSTOMER_PAYMENT_TRACKER: 'customer_payment_tracker',
  CUSTOMER_MATERIALS_TRACKER: 'customer_materials_tracker',
  CUSTOMER_UNLIMITED_PROJECTS: 'customer_unlimited_projects',
} as const;

ШАГ 2. В ProfiRole enum (если используется) добавить CUSTOMER:

enum ProfiRole {
  SMETCHIK
  PTO
  PRORAB
  CUSTOMER  // НОВЫЙ
}

ШАГ 3. В prisma/seeds/subscription-plans.ts добавить два плана:

{
  code: 'customer_free',
  category: 'B2C',
  profiRole: 'CUSTOMER',
  name: 'Заказчик Free',
  monthlyPrice: 0,
  yearlyPrice: 0,
  maxObjects: 1,
  features: [
    FEATURES.PROFILE,
    FEATURES.PHOTOS_GPS,
    FEATURES.COMMENTS,
    FEATURES.VIEW_ONLY,
  ],
  trialDays: 0,
  displayOrder: 100,
  isVisible: true,
},

{
  code: 'customer_pro',
  category: 'B2C',
  profiRole: 'CUSTOMER',
  name: 'Заказчик Pro',
  monthlyPrice: 190000,  // в копейках
  yearlyPrice: 1900000,  // -16% годовая
  maxObjects: -1,        // unlimited
  features: [
    FEATURES.CUSTOMER_HIDDEN_WORKS_CHECKLISTS,
    FEATURES.CUSTOMER_AI_LAWYER,
    FEATURES.CUSTOMER_CLAIM_TEMPLATES,
    FEATURES.CUSTOMER_PAYMENT_TRACKER,
    FEATURES.CUSTOMER_MATERIALS_TRACKER,
    FEATURES.CUSTOMER_UNLIMITED_PROJECTS,
    FEATURES.PHOTOS_GPS,
    FEATURES.COMMENTS,
  ],
  trialDays: 7,
  isFeatured: true,
  displayOrder: 101,
  isVisible: true,
},

ШАГ 4. Обновить лимиты:
limits: {
  ai_lawyer_questions_per_day: 20,
  hidden_works_checklists_per_month: -1,
}

КОМАНДА:
npx prisma db seed
# Проверить в БД:
SELECT code, "monthlyPrice", "maxObjects" FROM subscription_plans WHERE code LIKE 'customer%';
```

---

## 3.2. Новые модели для B2C

```
📋 ЗАДАЧА: Модели чек-листов, платежей, материалов, претензий

📁 ФАЙЛ: prisma/schema.prisma

model HiddenWorksChecklist {
  id              String   @id @default(uuid())
  projectId       String   // привязка к BuildingObject (не CustomerProject!)
  buildingObject  BuildingObject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  workType        HiddenWorkType
  status          ChecklistStatus @default(NOT_STARTED)
  scheduledDate   DateTime?
  completedAt     DateTime?
  notes           String?
  photoIdsBeforeS3Keys String[] @default([])
  photoIdsAfterS3Keys  String[] @default([])

  // Шаблонные данные клонированы при создании
  items           ChecklistItem[]

  createdById     String
  createdBy       User     @relation("ChecklistCreator", fields: [createdById], references: [id])
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([projectId])
  @@map("hidden_works_checklists")
}

enum HiddenWorkType {
  SCREED              // стяжка
  WATERPROOFING       // гидроизоляция
  ELECTRICAL_IN_WALLS // электрика в стенах
  PLUMBING_IN_WALLS   // сантехника в стенах
  THERMAL_INSULATION  // теплоизоляция
  VENTILATION         // вентиляция
  ROOF_LAYERS         // слои кровли
  FOUNDATION          // фундамент
}

enum ChecklistStatus {
  NOT_STARTED
  READY_TO_INSPECT
  INSPECTING
  PASSED
  ISSUES_FOUND
}

model ChecklistItem {
  id          String   @id @default(uuid())
  checklistId String
  checklist   HiddenWorksChecklist @relation(fields: [checklistId], references: [id], onDelete: Cascade)
  question    String
  hint        String?
  standard    String?  // ГОСТ/СП/СНиП
  passed      Boolean?
  comment     String?
  order       Int

  @@index([checklistId])
  @@map("checklist_items")
}

model CustomerPayment {
  id               String   @id @default(uuid())
  projectId        String
  buildingObject   BuildingObject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  paidAt           DateTime
  amount           Float
  purpose          String
  category         CustomerPaymentCategory
  recipient        String?
  receiptS3Key     String?
  paymentMethod    String?
  notes            String?
  authorId         String
  author           User @relation("CustomerPaymentAuthor", fields: [authorId], references: [id])
  createdAt        DateTime @default(now())

  @@index([projectId, paidAt])
  @@map("customer_payments")
}

enum CustomerPaymentCategory {
  MATERIALS
  WORK
  DESIGN
  EQUIPMENT
  DELIVERY
  OTHER
}

model CustomerMaterial {
  id              String   @id @default(uuid())
  projectId       String
  buildingObject  BuildingObject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title           String
  quantity        Float
  unit            String
  pricePerUnit    Float?
  totalPrice      Float?
  supplier        String?
  deliveredAt     DateTime?
  usedAt          DateTime?
  warrantyUntil   DateTime?
  photoS3Key      String?
  authorId        String
  author          User @relation("CustomerMaterialAuthor", fields: [authorId], references: [id])
  createdAt       DateTime @default(now())

  @@index([projectId])
  @@map("customer_materials")
}

model CustomerClaim {
  id                    String   @id @default(uuid())
  projectId             String
  buildingObject        BuildingObject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title                 String
  status                ClaimStatus @default(DRAFT)
  claimType             ClaimType
  contentMarkdown       String
  evidencePhotoS3Keys   String[] @default([])
  evidenceDocS3Keys     String[] @default([])
  generatedFromTemplate Boolean  @default(false)
  templateSlug          String?
  sentAt                DateTime?
  sentTo                String?
  responseText          String?
  authorId              String
  author                User @relation("CustomerClaimAuthor", fields: [authorId], references: [id])
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([projectId, status])
  @@map("customer_claims")
}

enum ClaimStatus {
  DRAFT
  SENT
  RESPONDED
  RESOLVED
  ESCALATED_TO_COURT
  DROPPED
}

enum ClaimType {
  QUALITY_ISSUE
  DELAY
  OVERBILLING
  MISSING_DOCUMENTS
  WARRANTY_VIOLATION
  OTHER
}

КОМАНДА:
npx prisma migrate dev --name customer_b2c_models
npx prisma generate
```

---

## 3.3. AI-юрист (используем существующий YandexGPT)

```
📋 ЗАДАЧА: Создать сервис AI-юриста с использованием существующей инфраструктуры

📁 ФАЙЛЫ:
- src/lib/ai/lawyer.ts (НОВЫЙ — сервис)
- src/app/api/customer/ai-lawyer/route.ts (POST)
- src/app/api/customer/ai-lawyer/history/route.ts (GET)

ИСПОЛЬЗУЕМ существующий код:
- src/lib/estimates/yandex-gpt.ts → паттерн вызова YandexGPT
- src/lib/estimates/gemini.ts → паттерн fallback на Gemini
- BullMQ (если AI-вызов длинный) или прямой call (если быстрый)

src/lib/ai/lawyer.ts:

const SYSTEM_PROMPT = `
Ты — опытный юрист по строительным подрядам в Российской Федерации.
Стаж 20 лет. Специализируешься на:
- ФЗ-44, ФЗ-223, ГК РФ глава 37 (подряд)
- ГОСТ Р 70108-2025 (исполнительная документация)
- Защита прав потребителей в строительстве

Отвечай по существу, без воды.
Структура ответа:
1. Краткий ответ (2-3 предложения)
2. Юридическое обоснование (статьи, нормы)
3. Что делать (план действий)
4. Если возможно — шаблон документа

ВАЖНО: всегда добавляй disclaimer:
"Это не юридическая консультация. Для серьёзных споров обратитесь к юристу."
`;

export async function askLawyer(params: {
  question: string;
  projectContext?: { id: string };
  previousMessages?: Array<{ role: 'user' | 'assistant', content: string }>;
}): Promise<{ answer: string; references: string[]; disclaimer: string }> {
  // Использовать тот же паттерн что parseChunkWithYandexGpt
  // Прокидывать SYSTEM_PROMPT в messages[0]
  // При ошибке — fallback на Gemini
  // Тайм-аут 30 секунд
}

API endpoint:

POST /api/customer/ai-lawyer
Auth: requireFeature(FEATURES.CUSTOMER_AI_LAWYER) — использует существующий require-feature
Также проверка: requireLimit('ai_lawyer_questions_per_day', currentCount)

Body: {
  question: string,
  projectId?: string  // для контекста — название проекта
}

Логика:
1. requireFeature → 402 если нет доступа
2. Подсчитать вопросов за сегодня (за последние 24 часа)
3. requireLimit → 403 если превышено 20/день
4. Вызвать askLawyer
5. Сохранить в новой модели LawyerConversation (нужно добавить):

model LawyerConversation {
  id        String   @id @default(uuid())
  userId    String
  user      User @relation("LawyerConversationUser", fields: [userId], references: [id])
  projectId String?
  buildingObject BuildingObject? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  messages  Json     // Array<{role, content, timestamp}>
  tokensUsed Int     @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, createdAt])
}

Return: { answer, references, disclaimer, conversationId }
```

---

## 3.4. Шаблоны чек-листов и претензий (контент)

```
📋 ЗАДАЧА: Наполнить базу шаблонами

📁 ФАЙЛЫ:
- src/content/customer-checklists/*.json (8 файлов)
- src/content/claim-templates/*.md (7 файлов)
- prisma/seeds/checklist-templates.ts
- prisma/seeds/customer-checklists-data.ts (для seed первичных шаблонов)

ШАГ 1. Создать 8 чек-листов:

prisma/seeds/customer-checklists-data.ts:

export const CHECKLIST_TEMPLATES = [
  {
    workType: 'SCREED',
    title: 'Приёмка стяжки пола',
    description: '...',
    items: [
      { question: 'Выставлены ли маяки перед заливкой?', hint: '...', standard: 'СП 71.13330.2017 п.7.4.2', order: 1 },
      // ... 12-15 вопросов
    ]
  },
  // ... 7 ещё для остальных HiddenWorkType
];

ШАГ 2. Шаблоны претензий (7 markdown-файлов):

src/content/claim-templates/quality-issue.md:

---
title: "Претензия по качеству работ"
type: "QUALITY_ISSUE"
variables:
  - contractorName
  - contractorInn
  - projectAddress
  - contractNumber
  - contractDate
  - issueDescription
  - referenceNorms
  - demandedActions
  - deadline
---

В адрес: {{contractorName}}, ИНН {{contractorInn}}

ПРЕТЕНЗИЯ
по качеству выполненных работ

Между мной, {{customerName}}, и {{contractorName}} был заключён договор подряда
№ {{contractNumber}} от {{contractDate}} на выполнение работ по адресу: {{projectAddress}}.

В ходе приёмки работ выявлены следующие нарушения:
{{issueDescription}}

Указанные недостатки противоречат:
{{referenceNorms}}

В соответствии со ст. 723 ГК РФ требую:
{{demandedActions}}

Срок устранения: {{deadline}}.

В случае невыполнения требований оставляю за собой право:
- Обратиться в суд для защиты своих прав
- Расторгнуть договор и взыскать убытки
- Привлечь сторонних специалистов с возмещением затрат

Дата: {{date}}
Подпись: ___________

ШАГ 3. Создать остальные 6 шаблонов аналогично:
- delay.md (срыв сроков)
- overbilling.md (завышение сметы)
- missing-documents.md (отсутствие ИД)
- warranty-violation.md (гарантия)
- pre-court.md (досудебная)
- contract-termination.md (отказ от договора)

ШАГ 4. Использовать handlebars (уже в проекте) для рендера:

src/lib/customer/render-claim.ts:
import Handlebars from 'handlebars';
import fs from 'fs/promises';

export async function renderClaim(
  templateSlug: string,
  variables: Record<string, string>
): Promise<string> {
  const path = `src/content/claim-templates/${templateSlug}.md`;
  const raw = await fs.readFile(path, 'utf-8');
  // Парсим frontmatter (gray-matter уже в проекте — используется в маркетинге)
  const { content } = matter(raw);
  const template = Handlebars.compile(content);
  return template(variables);
}
```

---

## 3.5. UI «Мой Ремонт»

```
📋 ЗАДАЧА: Отдельный shell для B2C-заказчика

📁 ФАЙЛЫ:
- src/app/(customer)/layout.tsx (НОВЫЙ — отдельная route group)
- src/app/(customer)/moy-remont/page.tsx (дашборд)
- src/app/(customer)/moy-remont/new/page.tsx (мастер создания объекта)
- src/app/(customer)/moy-remont/projects/[projectId]/page.tsx
- src/app/(customer)/moy-remont/projects/[projectId]/checklists/page.tsx
- src/app/(customer)/moy-remont/projects/[projectId]/payments/page.tsx
- src/app/(customer)/moy-remont/projects/[projectId]/materials/page.tsx
- src/app/(customer)/moy-remont/projects/[projectId]/claims/page.tsx
- src/app/(customer)/moy-remont/projects/[projectId]/claims/new/page.tsx
- src/app/(customer)/moy-remont/ai-lawyer/page.tsx
- src/app/(customer)/moy-remont/upgrade/page.tsx (paywall)

ROUTE GROUP (customer):
- Изолирован от (dashboard) и (guest)
- Свой layout — лёгкий, не "профессиональный" вид

MIDDLEWARE:
Расширить из Фазы 2 — добавить третью роль:

if (subscription.plan.profiRole === 'CUSTOMER' && !pathname.startsWith('/moy-remont') && !pathname.startsWith('/api/customer')) {
  return NextResponse.redirect(new URL('/moy-remont', req.url));
}

МАСТЕР СОЗДАНИЯ ОБЪЕКТА (/moy-remont/new):

<NewProjectWizard>
  Step 1: Тип объекта (RadioGroup)
    Квартира / Дом ИЖС / Реконструкция / Ванная / ...

  Step 2: Базовые данные
    Название (placeholder: "Ремонт на Ленина 10")
    Адрес (через Yandex Maps Geosuggest API — есть в env: NEXT_PUBLIC_YANDEX_MAPS_API_KEY)
    Площадь (м²)
    Дата начала
    Бюджет (опционально)

  Step 3: Подрядчик
    ◉ Хочу пригласить (по email/phone/ИНН)
       → создаст приглашение типа "клиент → подрядчик"
    ○ Ищу подрядчика → ссылка на /companies (KF-2 если реализован)
    ○ Веду сам

  Step 4: Готово
    "Создан объект! Что делать?"
    - "Включить чек-листы (Pro)"
    - "Добавить первую оплату"
    - "Загрузить смету или фото"
</NewProjectWizard>

API endpoint POST /api/customer/projects:
1. Создать BuildingObject в текущем PERSONAL workspace
2. Если приглашение — создать GuestInvitation для подрядчика (обратная схема Фазы 2!)
3. Return { projectId }

ДАШБОРД (/moy-remont):

<CustomerDashboard>
  <WelcomeHero name={user.firstName} />

  <MyProjectsGrid>
    Карточки BuildingObject в текущем workspace
    Free: max 1 показывается, остальные за paywall
  </MyProjectsGrid>

  <QuickActions>
    "+ Новый объект"
    "Занести оплату"
    "Проверить скрытые работы (Pro)"
    "Спросить юриста (Pro)"
  </QuickActions>

  <PaywallPromo if="free">
    "Откройте все возможности Pro за 1 900 ₽/мес"
  </PaywallPromo>
</CustomerDashboard>

ЧЕК-ЛИСТ СКРЫТЫХ РАБОТ:

<ChecklistRunner>
  <FeatureGate feature={FEATURES.CUSTOMER_HIDDEN_WORKS_CHECKLISTS}>
    <ChecklistTypeSelector />  // 8 плиток: Стяжка, Гидроизоляция, ...
    <ChecklistQuestions>
      Каждый вопрос — RadioGroup (Да / Нет / N/A) + поле комментария + загрузка фото
      Используем существующий CameraCapture из Модуля 16
    </ChecklistQuestions>
    <ChecklistResult>
      Если все Да — статус PASSED, кнопка "Скачать отчёт PDF"
      Если есть Нет — статус ISSUES_FOUND, кнопка "Составить претензию"
    </ChecklistResult>
  </FeatureGate>
</ChecklistRunner>

PDF-генерация: использовать существующую инфраструктуру Handlebars + Puppeteer
(паттерн из generateAosrPdf, generateExecutionDocPdf и других)

AI-ЮРИСТ:

<AiLawyerChat>
  <FeatureGate feature={FEATURES.CUSTOMER_AI_LAWYER}>
    <ChatHistory>
      Подгружает GET /api/customer/ai-lawyer/history
    </ChatHistory>
    <ChatInput
      placeholder="Напишите вопрос..."
      maxLength={2000}
    />
    <SuggestedQuestions>
      "Как принять скрытые работы?"
      "Что если подрядчик просит >30% предоплаты?"
      "Как составить претензию по срокам?"
    </SuggestedQuestions>
    <UsageLimit>
      "Осталось вопросов сегодня: {remaining}/20"
    </UsageLimit>
    <VoiceInputButton if="mobile">
      Использовать существующий VoiceInput компонент из Модуля 16!
    </VoiceInputButton>
  </FeatureGate>
</AiLawyerChat>

КОМПОНЕНТЫ (в src/components/customer/):
- CustomerLayout.tsx
- NewProjectWizard.tsx
- CustomerDashboard.tsx
- ChecklistRunner.tsx
- ChecklistResultPdf.tsx
- AiLawyerChat.tsx
- PaymentLedger.tsx
- MaterialTracker.tsx
- ClaimComposer.tsx
- ContractorInviteForm.tsx (обратная сторона GuestInvitation)
```

---

## 3.6. Команды для Claude Code — Фаза 3

```bash
# Команда 1. Миграция
npx prisma migrate dev --name customer_b2c_models
npx prisma generate

# Команда 2. Subscription plan
# Обновить prisma/seeds/subscription-plans.ts
# Обновить src/lib/subscriptions/features.ts
npx prisma db seed

# Команда 3. Контент
# Создать prisma/seeds/customer-checklists-data.ts (8 шаблонов)
# Создать 7 markdown файлов в src/content/claim-templates/
npm run seed:checklists  # отдельный скрипт seed:checklists в package.json

# Команда 4. AI-юрист
# Создать src/lib/ai/lawyer.ts
# Создать API /api/customer/ai-lawyer/route.ts
# Использовать паттерны из src/lib/estimates/yandex-gpt.ts

# Команда 5. UI
# Создать route group (customer) + layout
# 11 страниц + 10 компонентов

# Команда 6. Middleware
# Расширить из Фазы 2 — добавить редирект для CUSTOMER

# Команда 7. PDF чек-листов
# Использовать существующий generateExecutionDocPdf паттерн
# Создать templates/customer/checklist-result.hbs

# Команда 8. Маркетинг лендинг
# В komplid-marketing создать /dlya-zakazchika
# (см. отдельный документ MODULE_MARKETING_PLAN)

# Команда 9. Тесты
npx tsc --noEmit
# E2E:
# - signup как customer → онбординг → создание объекта
# - Free → 1 объект → попытка создать второй → paywall
# - Pro → unlimited объектов → AI-юрист → чек-лист → PDF
```

**ACCEPTANCE CRITERIA Фазы 3:**

- [ ] Заказчик-физлицо может зарегистрироваться через `/signup?role=customer`
- [ ] Создаётся PERSONAL Workspace + Subscription(plan=customer_free)
- [ ] Мастер создания объекта работает за < 3 минуты
- [ ] Free план: 1 объект (paywall на втором)
- [ ] Pro план: неограниченно
- [ ] Приглашение подрядчика по ИНН ищет в существующих Organization
- [ ] Чек-листы работают, генерируется PDF-отчёт
- [ ] AI-юрист отвечает (через YandexGPT с Gemini fallback)
- [ ] Лимит 20 вопросов/день работает
- [ ] Шаблоны претензий рендерятся через handlebars
- [ ] Трекер оплат и материалов работают (CRUD)
- [ ] PaywallGate использует FEATURES.CUSTOMER_* из Модуля 15
- [ ] Voice input работает в мобильной AI-юрист (использует Модуль 16)

---


---

# ЧАСТЬ II — KILLER-ФИЧИ

# KF-1 — AI-проверка комплектности ИД (2 недели)

## KF-1.0. Контекст

**Что есть:**
- Модель ExecutionDoc (Модуль 10) с типами AOSR/OZR/KS_2/KS_3/KS_6A/KS_11/KS_14/AVK/TECHNICAL_READINESS_ACT/GENERAL_DOCUMENT
- Inspection (Модуль 11) — проверки СК с привязанными Defect
- SpecialJournal + SpecialJournalEntry (Модуль 9) — журналы работ
- WorkRecord — записи о выполненных работах со списанием материалов
- YandexGPT клиент (для парсинга смет)
- BullMQ для фоновых задач
- IdClosurePackage (Модуль 10) — финальная сборка ИД для сдачи

**Что добавляем:**
1. Новые модели: AiComplianceCheck, AiComplianceIssue
2. Детерминированные правила (rules.ts)
3. AI-расширение через YandexGPT с function calling
4. UI: страница /id/compliance и интеграция в IdClosurePackage workflow

---

## KF-1.1. Prisma-модели

```
📁 prisma/schema.prisma:

model AiComplianceCheck {
  id            String   @id @default(uuid())
  projectId     String
  buildingObject BuildingObject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  initiatedById String
  initiator     User     @relation("ComplianceCheckInitiator", fields: [initiatedById], references: [id])
  scope         AiCheckScope
  scopeFilter   Json?
  status        AiCheckStatus @default(QUEUED)
  summary       String?
  issueCount    Int      @default(0)
  checkedDocs   Int      @default(0)
  tokensUsed    Int      @default(0)
  cost          Float    @default(0)
  startedAt     DateTime?
  finishedAt    DateTime?
  errorMessage  String?
  createdAt     DateTime @default(now())

  // Связь с пакетом ИД (если запускается перед сдачей)
  closurePackageId String?
  closurePackage   IdClosurePackage? @relation(fields: [closurePackageId], references: [id], onDelete: SetNull)

  issues        AiComplianceIssue[]

  @@index([projectId, status])
  @@map("ai_compliance_checks")
}

enum AiCheckScope {
  FULL_PROJECT
  CONTRACT
  STAGE
  DATE_RANGE
  PRE_DELIVERY
  CLOSURE_PACKAGE
}

enum AiCheckStatus {
  QUEUED
  RUNNING
  COMPLETED
  FAILED
}

model AiComplianceIssue {
  id            String   @id @default(uuid())
  checkId       String
  check         AiComplianceCheck @relation(fields: [checkId], references: [id], onDelete: Cascade)
  severity      IssueSeverity
  category      IssueCategory
  title         String
  description   String
  affectedDocIds String[] @default([])  // ExecutionDoc IDs
  affectedJournalIds String[] @default([])  // SpecialJournal entry IDs
  suggestedFix  String?
  standard      String?
  autoFixable   Boolean  @default(false)
  resolvedAt    DateTime?
  resolvedById  String?
  resolvedBy    User?    @relation("IssueResolver", fields: [resolvedById], references: [id])
  resolutionNote String?
  createdAt     DateTime @default(now())

  @@index([checkId, severity])
  @@map("ai_compliance_issues")
}

enum IssueSeverity {
  CRITICAL
  HIGH
  MEDIUM
  LOW
  INFO
}

enum IssueCategory {
  MISSING_DOCUMENT
  MISSING_SIGNATURE
  WRONG_DATE
  INCONSISTENCY
  MISSING_FIELD
  FORMAT_ERROR
  REGULATORY
  MISSING_CERTIFICATE
}

КОМАНДА:
npx prisma migrate dev --name ai_compliance_check
```

---

## KF-1.2. Движок проверки и API

```
📋 ЗАДАЧА: AI + детерминированные правила

📁 ФАЙЛЫ:
- src/lib/ai/compliance/engine.ts
- src/lib/ai/compliance/rules.ts
- src/lib/ai/compliance/prompts.ts
- src/workers/ai-compliance.worker.ts
- src/app/api/projects/[projectId]/compliance-checks/route.ts (POST, GET)
- src/app/api/projects/[projectId]/compliance-checks/[checkId]/route.ts (GET)
- src/app/api/projects/[projectId]/compliance-checks/[checkId]/issues/[issueId]/resolve/route.ts (POST)

src/lib/ai/compliance/rules.ts — минимум 30 правил:

import { ExecutionDoc, SpecialJournalEntry, WorkRecord, ApprovalRoute } from '@prisma/client';

interface RuleContext {
  docs: ExecutionDoc[];
  journals: SpecialJournalEntry[];
  workRecords: WorkRecord[];
  defects: Defect[];
  // ... другие связанные данные
}

interface RuleViolation {
  severity: IssueSeverity;
  category: IssueCategory;
  title: string;
  description: string;
  affectedDocIds: string[];
  suggestedFix?: string;
  standard?: string;
}

export const RULES: Array<(ctx: RuleContext) => RuleViolation[]> = [
  // 1. Каждый АОСР должен иметь WorkRecord
  (ctx) => {
    return ctx.docs
      .filter(d => d.type === 'AOSR' && !d.workRecordId)
      .map(d => ({
        severity: 'HIGH',
        category: 'MISSING_FIELD',
        title: `АОСР ${d.number}: не привязан к записи о работе`,
        description: 'Каждый АОСР должен ссылаться на конкретную запись WorkRecord',
        affectedDocIds: [d.id],
        suggestedFix: 'Привязать к существующей WorkRecord или создать новую',
        standard: 'СП 48.13330.2019 п.5.4',
      }));
  },

  // 2. АОСР на скрытые работы должен иметь фото
  (ctx) => {
    return ctx.docs
      .filter(d => d.type === 'AOSR')
      .filter(d => {
        const hasPhotos = ctx.photos.some(p =>
          p.entityType === 'WORK_RECORD' && p.entityId === d.workRecordId
        );
        return !hasPhotos;
      })
      .map(d => ({
        severity: 'CRITICAL',
        category: 'MISSING_DOCUMENT',
        title: `АОСР ${d.number}: отсутствуют фото скрытых работ`,
        description: 'По АОСР должны быть приложены фото до и после работ',
        affectedDocIds: [d.id],
        standard: 'СП 70.13330.2012 п.10.1',
      }));
  },

  // 3. КС-2 должен включать только работы из утверждённой сметы
  (ctx) => {
    const ks2Docs = ctx.docs.filter(d => d.type === 'KS_2');
    // ... логика проверки против EstimateItem
  },

  // 4. Для каждого материала на скрытые работы — паспорт
  // 5. Подписи на АОСР: подрядчик + технадзор обязательно
  // 6. Дата АОСР не может быть позже даты КС-2 включающей эту работу
  // 7. ОЖР должен иметь записи каждый рабочий день
  // 8. Журнал бетонных работ при наличии бетонных работ в АОСР
  // 9. Журнал сварки при наличии сварных работ
  // 10. Авторский надзор должен быть для уникальных объектов
  // ... до 30+

  // Для AOSR-специфичных правил можно использовать данные из существующего
  // execution-docs/[docId]/autofill-from-aosr endpoint — там уже есть логика связи
  // АОСР ↔ ОЖР
];

src/lib/ai/compliance/engine.ts:

export async function runComplianceCheck(checkId: string) {
  const check = await db.aiComplianceCheck.findUnique({ where: { id: checkId } });
  if (!check) throw new Error('Check not found');

  await db.aiComplianceCheck.update({
    where: { id: checkId },
    data: { status: 'RUNNING', startedAt: new Date() }
  });

  try {
    // Шаг 1: Собрать корпус
    const ctx = await gatherContext(check);

    // Шаг 2: Детерминированные правила
    const deterministicViolations = RULES.flatMap(rule => rule(ctx));

    // Шаг 3: AI-расширение через YandexGPT (используя function calling)
    const aiViolations = await runAiChecks(ctx);

    // Шаг 4: Сохранить
    await db.$transaction(async (tx) => {
      await tx.aiComplianceIssue.createMany({
        data: [...deterministicViolations, ...aiViolations].map(v => ({
          checkId,
          ...v,
        }))
      });

      await tx.aiComplianceCheck.update({
        where: { id: checkId },
        data: {
          status: 'COMPLETED',
          finishedAt: new Date(),
          issueCount: deterministicViolations.length + aiViolations.length,
          checkedDocs: ctx.docs.length,
          summary: generateSummary(deterministicViolations, aiViolations),
        }
      });
    });

    // Шаг 5: Уведомление
    await db.notification.create({
      data: {
        type: 'compliance_check_completed',
        title: 'AI-проверка завершена',
        body: `Найдено ${...} проблем`,
        userId: check.initiatedById,
        entityType: 'AiComplianceCheck',
        entityId: checkId,
      }
    });
  } catch (err) {
    await db.aiComplianceCheck.update({
      where: { id: checkId },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        errorMessage: err instanceof Error ? err.message : String(err),
      }
    });
    throw err;
  }
}

src/workers/ai-compliance.worker.ts (BullMQ):
import { Worker } from 'bullmq';
import { runComplianceCheck } from '@/lib/ai/compliance/engine';
import { redis } from '@/lib/redis';

new Worker('ai-compliance', async (job) => {
  await runComplianceCheck(job.data.checkId);
}, {
  connection: redis,
  concurrency: 2,
});

// ВАЖНО (из docs/lessons.md): error handler с rate-limiting!

API:

POST /api/projects/[projectId]/compliance-checks
  Body: { scope, scopeFilter? }
  Auth: requireFeature(FEATURES.AI_COMPLIANCE_CHECK) — нужно добавить feature
  requireLimit('compliance_checks_per_month', currentCount)
  Лимиты по плану:
  - Free: 5/мес
  - Team: 50/мес
  - Corporate: -1
  Логика:
  - Создать AiComplianceCheck(status=QUEUED)
  - bullmq.add('ai-compliance', { checkId })
  Return: { checkId, estimatedTimeMin: 2-5 }

GET /api/projects/[projectId]/compliance-checks/[checkId]
  Return: { check, issues: [...] }

POST .../issues/[issueId]/resolve
  Body: { resolution: 'manual_fix' | 'ignore' | 'not_applicable', note? }
```

---

## KF-1.3. UI

```
📁 ФАЙЛЫ:
- src/app/(dashboard)/objects/[objectId]/id/compliance/page.tsx
- src/components/compliance/RunCheckDialog.tsx
- src/components/compliance/CheckResultsView.tsx
- src/components/compliance/IssueCard.tsx
- src/components/compliance/SeverityBadge.tsx
- Интеграция в IdClosureView.tsx (Модуль 10)

В существующем ObjectIdModule (Модуль 10) добавить вкладку "AI-проверка"
(или интегрировать в существующую вкладку "Закрывающий пакет"):

<IdClosureView>
  <RunComplianceCheckButton>
    "Проверить пакет перед сдачей" (при создании IdClosurePackage)
  </RunComplianceCheckButton>
  <ComplianceResults if="check exists">
    Если есть CRITICAL issues — кнопка "Создать пакет" disabled
    с подсказкой "Исправьте критичные ошибки"
  </ComplianceResults>
</IdClosureView>

Страница /id/compliance:

<CompliancePage>
  <RunCheckSection>
    <ScopeSelector />
    <RunCheckButton />
  </RunCheckSection>

  <PreviousChecksList />

  <CheckResultView if="check selected">
    <Summary>
      "Найдено: 3 CRITICAL, 7 HIGH, 12 MEDIUM, 5 LOW"
      Progress bar готовности (рассчитывается из соотношения)
    </Summary>

    <IssuesList groupBy="severity">
      <IssueCard>
        <SeverityBadge />
        <Title />
        <Description />
        <AffectedDocsLinks /> // линки на конкретные документы для перехода
        <SuggestedFix />
        <StandardReference />
        <Actions>
          "Перейти к документу" | "Игнорировать" | "Исправить и переотметить"
        </Actions>
      </IssueCard>
    </IssuesList>

    <ExportActions>
      "Скачать отчёт PDF" | "Отправить заказчику email"
    </ExportActions>
  </CheckResultView>
</CompliancePage>
```

---

## KF-1.4. Команды для Claude Code — KF-1

```bash
# Команда 1. Миграция
npx prisma migrate dev --name ai_compliance_check

# Команда 2. Feature и план
# Добавить FEATURES.AI_COMPLIANCE_CHECK в src/lib/subscriptions/features.ts
# Обновить planFeatures для team/corporate

# Команда 3. Движок
# src/lib/ai/compliance/engine.ts
# src/lib/ai/compliance/rules.ts (минимум 30 правил)
# src/lib/ai/compliance/prompts.ts

# Команда 4. BullMQ воркер
# src/workers/ai-compliance.worker.ts
# Регистрация в start-workers.ts (если есть) или ручной запуск
# ОБЯЗАТЕЛЬНО error handler с rate-limiting (см. docs/lessons.md)

# Команда 5. API (3 endpoint)
# Использовать существующий requireFeature, requireLimit

# Команда 6. UI
# Создать страницу + 4 компонента
# Расширить ObjectIdModule (Модуль 10) — добавить вкладку или кнопку

# Команда 7. PDF отчёт
# Использовать существующий Handlebars + Puppeteer паттерн
# templates/compliance/report.hbs

# Команда 8. Тесты
npx tsc --noEmit
# Unit-тесты на каждое правило с edge cases
# E2E: создать заведомо неполный пакет → запустить проверку → найдено
```

**ACCEPTANCE CRITERIA KF-1:**

- [ ] Кнопка запуска работает из /id/compliance и из IdClosureView
- [ ] Проверка запускается через BullMQ, UI polling статуса
- [ ] Минимум 30 детерминированных правил отрабатывают
- [ ] AI-часть возвращает структурированный JSON через YandexGPT function calling
- [ ] При CRITICAL issues — IdClosurePackage создание блокируется
- [ ] Каждая issue имеет линк на документ
- [ ] Отчёт экспортируется в PDF
- [ ] Лимиты по тарифу работают (5/50/unlimited в месяц)
- [ ] Токены и стоимость считаются и сохраняются

---

# KF-2 — Публичное портфолио подрядчика (1 неделя)

## KF-2.0. Контекст

Превращаем завершённые публичные дашборды (Фаза 1) в SEO-страницу подрядчика.

**Существующее:**
- Organization модель уже есть с полями name, inn, ogrn, address, sroName, sroNumber
- В komplid-marketing создан /companies (если уже создан в Module_marketing_plan)
- Photo, ExecutionDoc — переиспользуем

**Что добавляем:**
1. Расширение Organization — публичный slug, описание, специализации
2. Модель ContractorReview — отзывы заказчиков
3. PortfolioItem — публикация выбранных проектов
4. UI управления + интеграция с маркетингом

---

## KF-2.1. Prisma

```
📁 schema.prisma:

ШАГ 1. Расширить существующую Organization:

model Organization {
  // ... существующие поля
  publicProfileEnabled  Boolean  @default(false)
  publicSlug            String?  @unique
  publicDescription     String?
  publicLogoS3Key       String?
  publicHeaderImageS3Key String?
  publicFoundedYear     Int?
  publicTeamSize        String?  // "1-5", "5-20", "20-100", "100+"
  publicSpecializations String[] @default([])
  publicGeoRegions      String[] @default([])
  publicWebsite         String?
  publicContactPhone    String?
  publicContactEmail    String?
  publicSocialLinks     Json?
  verifiedBusinessAt    DateTime?  // через ФНС API (Dadata/Checko) или вручную

  reviews        ContractorReview[]
  portfolioItems PortfolioItem[]
}

ШАГ 2. ContractorReview:

model ContractorReview {
  id              String   @id @default(uuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  projectId       String
  buildingObject  BuildingObject @relation(fields: [projectId], references: [id])
  authorName      String
  authorRole      String?  // "Частный заказчик", "Генподрядчик"
  rating          Int      // 1-5
  pros            String?
  cons            String?
  content         String
  verified        Boolean  @default(false)
  status          ReviewStatus @default(PENDING_MODERATION)
  submittedAt     DateTime @default(now())
  publishedAt     DateTime?

  @@index([organizationId, status])
  @@map("contractor_reviews")
}

enum ReviewStatus {
  PENDING_MODERATION
  PUBLISHED
  REJECTED
  HIDDEN
}

ШАГ 3. PortfolioItem (поверх существующего BuildingObject):

model PortfolioItem {
  id              String   @id @default(uuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  projectId       String   @unique
  buildingObject  BuildingObject @relation(fields: [projectId], references: [id])
  title           String
  excerpt         String?
  coverPhotoS3Key String?
  showInPortfolio Boolean  @default(false)
  order           Int      @default(0)
  publishedAt     DateTime?
  slug            String?  @unique

  @@index([organizationId, showInPortfolio])
  @@map("portfolio_items")
}

КОМАНДА:
npx prisma migrate dev --name contractor_portfolio
```

---

## KF-2.2. API

```
📁 ФАЙЛЫ:
- src/app/api/organizations/[orgId]/public-profile/route.ts (GET, PATCH)
- src/app/api/organizations/[orgId]/public-profile/portfolio/route.ts (GET, POST)
- src/app/api/organizations/[orgId]/public-profile/portfolio/[itemId]/route.ts (PATCH, DELETE)
- src/app/api/organizations/[orgId]/reviews/route.ts (GET для модерации)
- src/app/api/public/contractors/[slug]/route.ts (ПУБЛИЧНЫЙ)
- src/app/api/public/contractors/[slug]/reviews/route.ts (ПУБЛИЧНЫЙ)
- src/app/api/public/contractors/search/route.ts (ПУБЛИЧНЫЙ)
- src/app/api/public/review-request/[token]/route.ts (для заказчиков — оставить отзыв)

GET /api/public/contractors/[slug]:
Return: {
  organization: { name, description, logoUrl (presigned), headerUrl, ...
                  verifiedBusinessAt, foundedYear, ... },
  stats: {
    completedProjects: count(BuildingObject where status=COMPLETED and orgId),
    avgRating: avg(reviews.rating where verified=true),
    reviewCount: count(reviews where status=PUBLISHED),
    yearsActive: now() - earliest BuildingObject.startDate,
  },
  portfolio: [{ ... PortfolioItem with downloadUrl for cover }],
  recentProjects: [...] // BuildingObject completed last 12 months
}

GET /api/public/contractors/search?q&region&specialization&minRating:
Полнотекстовый поиск (PostgreSQL tsvector)
Return: paginated list

POST /api/public/review-request/[token]:
Без auth. Заказчик переходит по ссылке-приглашению (после завершения проекта)
Создаёт ContractorReview с status=PENDING_MODERATION
```

---

## KF-2.3. UI управления (в приложении)

```
📁 ФАЙЛЫ:
- src/app/(dashboard)/settings/organization/public-profile/page.tsx (НОВЫЙ — в существующих настройках)
- src/components/organization/PublicProfileEditor.tsx
- src/components/organization/PortfolioManager.tsx
- src/components/organization/ReviewsModerator.tsx

ВАЖНО: помещаем в существующий /settings/organization/, не создаём отдельный раздел.

<PublicProfileEditor>
  <EnableToggle />
  <SlugEditor with={uniqueness validation} />
  <CompanyInfoForm>
    Логотип, header, описание, год, размер команды, специализации
    + Кнопка "Проверить ИНН" → Dadata API (env.DADATA_API_KEY)
  </CompanyInfoForm>
  <PortfolioManager>
    Список COMPLETED BuildingObject + checkbox "Показать публично"
    Кастомизация title, excerpt, cover photo
  </PortfolioManager>
  <ReviewsModerator>
    PENDING/PUBLISHED/REJECTED отзывы
    Кнопка "Запросить отзыв" → создаёт review request token
  </ReviewsModerator>
</PublicProfileEditor>
```

---

## KF-2.4. Публичная страница (komplid-marketing)

```
В отдельном репо komplid-marketing (см. MODULE_MARKETING_PLAN):

📁 ФАЙЛЫ:
- src/app/companies/page.tsx (каталог)
- src/app/companies/[slug]/page.tsx (профиль)
- src/components/contractor/* (компоненты)

Данные тянутся через fetch app.komplid.ru/api/public/contractors/[slug]
ISR с revalidate=3600

SEO:
- <title>{name} — строительный подрядчик в {region} | Komplid</title>
- Schema.org LocalBusiness + AggregateRating
- Sitemap: /companies/[slug] для всех publicProfileEnabled=true
```

---

## KF-2.5. Команды Claude Code — KF-2

```bash
# stroydocs/:
npx prisma migrate dev --name contractor_portfolio
# Создать API (8 файлов)
# Создать UI в settings/organization/public-profile
# Запрос отзыва: после завершения проекта (status COMPLETED)
#   → BullMQ delayed job через 7 дней → email клиенту
# Подключить Dadata API для верификации ИНН

# komplid-marketing/:
# Создать /companies каталог + /companies/[slug] профиль
# ISR + Schema.org
```

**ACCEPTANCE CRITERIA KF-2:**

- [ ] Подрядчик настраивает публичный профиль
- [ ] Slug уникален, валидируется
- [ ] Проверка ИНН через Dadata работает
- [ ] /companies/[slug] открывается, индексируется
- [ ] Schema.org валиден
- [ ] Запрос отзыва автоматически отправляется через 7 дней после COMPLETED
- [ ] Каталог /companies имеет фильтры и пагинацию
- [ ] Lighthouse > 90

---


# KF-3 — OCR сканов актов через Yandex Vision (3 недели)

## KF-3.0. Контекст

**Что есть:**
- Yandex Cloud SDK подключён (используется YANDEX_CLOUD_API_KEY и YANDEX_FOLDER_ID для GPT)
- BullMQ для фоновых задач
- Timeweb S3 для хранения файлов
- Существующие шаблоны парсинга в `src/lib/estimates/yandex-gpt.ts` (структурный output через function calling)

**Что добавляем:**
1. Yandex Vision API клиент (новая интеграция, но в той же экосистеме)
2. Модель OcrJob
3. Парсеры для AOSR/KS-2/OZR/MaterialPassport
4. UI мастер загрузки + side-by-side review

---

## KF-3.1. Prisma

```
📁 schema.prisma:

model OcrJob {
  id              String   @id @default(uuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  initiatedById   String
  initiator       User     @relation("OcrJobInitiator", fields: [initiatedById], references: [id])
  sourceS3Key     String
  sourceFileName  String
  sourceMimeType  String
  targetType      OcrTargetType
  status          OcrStatus @default(QUEUED)
  rawText         String?  @db.Text
  extractedJson   Json?
  confidence      Float?
  errorMessage    String?
  startedAt       DateTime?
  completedAt     DateTime?
  createdAt       DateTime @default(now())

  // Если из OCR создан реальный документ
  linkedExecutionDocId String?
  linkedExecutionDoc   ExecutionDoc? @relation(fields: [linkedExecutionDocId], references: [id], onDelete: SetNull)

  // Контекст создания (опционально)
  projectId       String?
  buildingObject  BuildingObject? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  contractId      String?
  contract        Contract? @relation(fields: [contractId], references: [id], onDelete: SetNull)

  @@index([organizationId, status])
  @@index([projectId])
  @@map("ocr_jobs")
}

enum OcrTargetType {
  AOSR
  KS_2
  KS_3
  OZR
  MATERIAL_PASSPORT
  RECEIPT
  GENERIC
}

enum OcrStatus {
  QUEUED
  DOWNLOADING
  OCR_IN_PROGRESS
  PARSING
  NEEDS_REVIEW
  COMPLETED
  FAILED
}

КОМАНДА:
npx prisma migrate dev --name ocr_jobs
```

---

## KF-3.2. Yandex Vision клиент

```
📁 src/lib/ocr/yandex-vision.ts (НОВЫЙ):

Использует тот же IAM/folder что и YandexGPT:
- env.YANDEX_CLOUD_API_KEY (уже есть)
- env.YANDEX_FOLDER_ID (уже есть)

API: POST https://vision.api.cloud.yandex.net/vision/v1/batchAnalyze

interface VisionResult {
  text: string;
  blocks: Array<{
    boundingBox: { vertices: Array<{x, y}> };
    lines: Array<{ words: Array<{ text, confidence }> }>;
  }>;
  tables?: Array<{ rows: Array<Array<string>>; }>;
}

export async function analyzeImage(
  imageBuffer: Buffer,
  options?: { extractTables?: boolean }
): Promise<VisionResult> {
  const base64 = imageBuffer.toString('base64');

  const features = [
    { type: 'TEXT_DETECTION', text_detection_config: { language_codes: ['ru', 'en'] }}
  ];

  if (options?.extractTables) {
    features.push({ type: 'TABLE_DETECTION' });
  }

  const response = await fetch('https://vision.api.cloud.yandex.net/vision/v1/batchAnalyze', {
    method: 'POST',
    headers: {
      'Authorization': `Api-Key ${process.env.YANDEX_CLOUD_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      folderId: process.env.YANDEX_FOLDER_ID,
      analyze_specs: [{
        content: base64,
        features,
      }]
    })
  });

  if (!response.ok) throw new Error(`Vision API error: ${response.status}`);
  return parseVisionResponse(await response.json());
}

📁 src/lib/ocr/pdf-splitter.ts:
import { PDFDocument } from 'pdf-lib';  // уже в проекте (используется в QR-stamp)

export async function splitPdfToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
  // Использовать pdfjs-dist для рендеринга страниц в PNG
  // ВАЖНО: pdfjs-dist может уже быть в проекте (используется в react-pdf)
  // Если нет — npm install pdfjs-dist canvas
}
```

---

## KF-3.3. Парсеры по типам документов

```
📁 src/lib/ocr/parsers/aosr.ts:

import Handlebars from 'handlebars';  // уже в проекте
import { parseChunkWithYandexGpt } from '@/lib/estimates/yandex-gpt';  // переиспользуем!

interface AosrExtractedData {
  number?: string;
  date?: string;
  projectName?: string;
  projectAddress?: string;
  contractNumber?: string;
  customerName?: string;
  generalContractorName?: string;
  subcontractorName?: string;
  workType?: string;
  workStartDate?: string;
  workEndDate?: string;
  materials?: Array<{ name: string; documentType?: string; gostMark?: string; }>;
  works?: Array<{ name: string; volume?: number; unit?: string; }>;
  projectDocReference?: string;
  standardReference?: string;
  participants?: Array<{ role: string; orgName?: string; representativeName?: string; }>;
  signaturesPresent?: { contractor: boolean; supervision: boolean; customer: boolean; };
}

export async function parseAosr(rawText: string): Promise<{
  extracted: AosrExtractedData;
  confidence: number;
}> {
  // Этап 1: Regex для типовых паттернов
  const number = rawText.match(/(?:АКТ|Акт)\s*№?\s*([А-Я0-9\-\/\.]+)/)?.[1];
  const date = rawText.match(/«(\d{1,2})»\s*(\w+)\s*(\d{4})/)?.slice(1).join(' ');
  // ... ещё 10-15 регулярок

  // Этап 2: AI-расширение для сложных полей через YandexGPT function calling
  const aiExtracted = await callYandexGptForAosr(rawText);

  // Этап 3: Слияние и оценка confidence
  const merged = { ...aiExtracted, ...{ number, date /* override regex */ } };
  const confidence = calculateConfidence(merged, rawText);

  return { extracted: merged, confidence };
}

async function callYandexGptForAosr(rawText: string) {
  const systemPrompt = `
    Ты — эксперт по исполнительной документации в строительстве РФ.
    Извлеки из текста АОСР следующие поля и верни СТРОГО JSON:
    {
      number, date, projectName, ...
    }
    Если поле не нашёл — null.
  `;
  // Использовать паттерн из существующего yandex-gpt.ts
  // Function calling если YandexGPT поддерживает (или structured output через JSON-mode)
}
```

Аналогично создать:
- src/lib/ocr/parsers/ks2.ts
- src/lib/ocr/parsers/ozr.ts
- src/lib/ocr/parsers/material-passport.ts

---

## KF-3.4. API + Worker

```
📁 ФАЙЛЫ:
- src/app/api/ocr/jobs/route.ts (POST upload, GET list)
- src/app/api/ocr/jobs/[id]/route.ts (GET, DELETE)
- src/app/api/ocr/jobs/[id]/apply/route.ts (POST — создать ExecutionDoc)
- src/workers/ocr.worker.ts

POST /api/ocr/jobs:
  Auth: requireFeature(FEATURES.OCR_SCAN)
  requireLimit('ocr_jobs_per_month', currentCount)
  Body (multipart/form-data):
    file: File (max 20 MB; types: image/jpeg, image/png, application/pdf)
    targetType: OcrTargetType
    projectId?: string
    contractId?: string

  Логика:
  1. Загрузить в S3 (используем существующий buildS3Key + uploadFile)
  2. Создать OcrJob(status=QUEUED)
  3. bullmq.add('ocr', { jobId })
  Return: { jobId, estimatedTimeMin: 1-3 }

POST .../jobs/[id]/apply:
  Body: {
    correctedJson: AosrExtractedData,  // с правками юзера
    createDocument: true,
    contractId: string,
    workRecordId?: string,
  }
  Логика:
  1. Использовать существующий POST /api/projects/[projectId]/contracts/[contractId]/execution-docs/
     для создания ExecutionDoc
  2. Если для AOSR — переиспользовать generate-pdf endpoint
  3. Связать ocrJob.linkedExecutionDocId
  Return: { document }

src/workers/ocr.worker.ts:
import { Worker } from 'bullmq';
import { db } from '@/lib/db';
import { downloadFile } from '@/lib/s3-utils';
import { analyzeImage, splitPdfToImages } from '@/lib/ocr/yandex-vision';
import { parseAosr, parseKs2, parseOzr } from '@/lib/ocr/parsers';

new Worker('ocr', async (job) => {
  const ocrJobId = job.data.jobId;
  const ocrJob = await db.ocrJob.findUnique({ where: { id: ocrJobId } });

  await db.ocrJob.update({
    where: { id: ocrJobId },
    data: { status: 'DOWNLOADING', startedAt: new Date() }
  });

  const fileBuffer = await downloadFile(ocrJob.sourceS3Key);

  await db.ocrJob.update({
    where: { id: ocrJobId },
    data: { status: 'OCR_IN_PROGRESS' }
  });

  const pages = ocrJob.sourceMimeType === 'application/pdf'
    ? await splitPdfToImages(fileBuffer)
    : [fileBuffer];

  const visionResults = await Promise.all(pages.map(p => analyzeImage(p)));
  const rawText = visionResults.map(r => r.text).join('\n\n--- PAGE ---\n\n');

  await db.ocrJob.update({
    where: { id: ocrJobId },
    data: { status: 'PARSING', rawText }
  });

  let parsed;
  switch (ocrJob.targetType) {
    case 'AOSR': parsed = await parseAosr(rawText); break;
    case 'KS_2': parsed = await parseKs2(rawText); break;
    case 'OZR': parsed = await parseOzr(rawText); break;
    default: parsed = { extracted: { rawText }, confidence: 0.5 };
  }

  const status = parsed.confidence < 0.85 ? 'NEEDS_REVIEW' : 'COMPLETED';

  await db.ocrJob.update({
    where: { id: ocrJobId },
    data: {
      status,
      extractedJson: parsed.extracted,
      confidence: parsed.confidence,
      completedAt: new Date(),
    }
  });

  // Notification
  await db.notification.create({
    data: {
      type: 'ocr_completed',
      userId: ocrJob.initiatedById,
      title: status === 'NEEDS_REVIEW' ? 'OCR требует проверки' : 'OCR завершён',
      body: `Распознан документ "${ocrJob.sourceFileName}"`,
      entityType: 'OcrJob',
      entityId: ocrJobId,
    }
  });
}, {
  connection: redis,
  concurrency: 3,
});

// ОБЯЗАТЕЛЬНО (docs/lessons.md): error handler с rate-limiting
```

---

## KF-3.5. UI

```
📁 ФАЙЛЫ:
- src/app/(dashboard)/ocr/page.tsx (список заданий)
- src/app/(dashboard)/ocr/new/page.tsx (мастер)
- src/app/(dashboard)/ocr/[id]/review/page.tsx (review)
- src/components/ocr/OcrUploadDropzone.tsx
- src/components/ocr/TargetTypeSelector.tsx
- src/components/ocr/OcrSideBySideView.tsx
- src/components/ocr/ExtractedFieldsEditor.tsx
- src/components/ocr/OcrProgressIndicator.tsx (SSE или polling)

Использовать существующие:
- react-dropzone (уже в проекте — используется в Модуле 4)
- react-pdf для просмотра PDF (уже)

ИНТЕГРАЦИЯ В СУЩЕСТВУЮЩИЙ UI:
В карточке создания ExecutionDoc (Модуль 10) добавить кнопку
"Распознать со скана" → переход на /ocr/new с предзаполненным
contractId/projectId/targetType.
```

---

## KF-3.6. Команды Claude Code — KF-3

```bash
# Команда 1. Миграция
npx prisma migrate dev --name ocr_jobs

# Команда 2. Yandex Vision
# src/lib/ocr/yandex-vision.ts
# Тестировать на dev: реальный API call с тестовой картинкой

# Команда 3. PDF splitter
# Если pdfjs-dist уже подключён (как часть react-pdf) — использовать
# Иначе: npm install pdfjs-dist canvas

# Команда 4. Парсеры (4 файла)
# AOSR, KS_2, OZR, MaterialPassport
# Использовать существующий yandex-gpt.ts паттерн с function calling

# Команда 5. Worker
# src/workers/ocr.worker.ts с rate-limited error handler
# Регистрация в существующей системе worker'ов

# Команда 6. API (3 endpoint)

# Команда 7. UI
# 3 страницы + 5 компонентов

# Команда 8. Feature
# Добавить FEATURES.OCR_SCAN
# Лимиты в planFeatures: Free 5, Team 100, Corporate -1

# Команда 9. Тесты
npx tsc --noEmit
# Тестовые сканы: 10-20 реальных АОСР для проверки accuracy
# Метрика: field-level >= 90%
```

**ACCEPTANCE CRITERIA KF-3:**

- [ ] Загрузка JPG/PNG/PDF работает (max 20 MB)
- [ ] OCR одной страницы: < 30 сек
- [ ] Точность извлечения: >= 90% для типовых АОСР
- [ ] UI side-by-side показывает оригинал + поля
- [ ] Confidence < 0.85 → подсветка, требует review
- [ ] Создание ExecutionDoc из OCR использует существующий paths
- [ ] Лимиты по тарифу работают
- [ ] Стоимость отображается (~3-5 руб/страницу)

---

# KF-4 — Маркетплейс субподрядчиков (4 недели)

## KF-4.0. Контекст и предусловие

**ВАЖНО:** запускать только после **1000+ активных аккаунтов** (см. оригинальный документ из `портал заказчика и клиента.docx`).

Используем:
- ContractorReview из KF-2 для рейтингов
- PortfolioItem из KF-2 для карточек подрядчиков
- Organization для базовой информации
- Notification для in-app уведомлений
- BullMQ для модерации
- YandexGPT для авто-фильтра спама

---

## KF-4.1. Prisma

```
📁 schema.prisma:

model MarketplaceListing {
  id             String   @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdById    String
  creator        User     @relation("MarketplaceListingCreator", fields: [createdById], references: [id])
  type           ListingType
  title          String
  description    String   @db.Text
  specialization String
  region         String
  city           String?
  budgetMin      Float?
  budgetMax      Float?
  currency       String   @default("RUB")
  startDate      DateTime?
  deadline       DateTime?
  status         ListingStatus @default(DRAFT)
  visibility     ListingVisibility @default(PUBLIC)
  viewCount      Int      @default(0)
  responseCount  Int      @default(0)
  attachmentS3Keys String[] @default([])
  publishedAt    DateTime?
  expiresAt      DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  responses      MarketplaceResponse[]

  @@index([type, status, region])
  @@index([specialization, status])
  @@map("marketplace_listings")
}

enum ListingType {
  CUSTOMER_REQUEST
  CONTRACTOR_OFFER
  SUBCONTRACTOR_REQUEST
  MATERIAL_SUPPLY
}

enum ListingStatus {
  DRAFT
  MODERATION
  PUBLISHED
  CLOSED
  EXPIRED
  BANNED
}

enum ListingVisibility {
  PUBLIC
  VERIFIED_ONLY
  PREMIUM_ONLY
}

model MarketplaceResponse {
  id                       String   @id @default(uuid())
  listingId                String
  listing                  MarketplaceListing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  respondingOrganizationId String
  respondingOrganization   Organization @relation("MarketplaceResponseOrg", fields: [respondingOrganizationId], references: [id])
  responderUserId          String
  responder                User @relation("MarketplaceResponder", fields: [responderUserId], references: [id])
  message                  String   @db.Text
  proposedPrice            Float?
  proposedDeadline         DateTime?
  attachmentS3Keys         String[] @default([])
  status                   ResponseStatus @default(NEW)
  respondedAt              DateTime @default(now())
  selectedAt               DateTime?
  rejectedAt               DateTime?
  rejectionReason          String?

  messages                 MarketplaceMessage[]

  @@index([listingId, status])
  @@map("marketplace_responses")
}

enum ResponseStatus {
  NEW
  VIEWED
  IN_DIALOG
  SELECTED
  REJECTED
}

model MarketplaceMessage {
  id          String   @id @default(uuid())
  responseId  String
  response    MarketplaceResponse @relation(fields: [responseId], references: [id], onDelete: Cascade)
  authorId    String
  author      User @relation("MarketplaceMessageAuthor", fields: [authorId], references: [id])
  content     String   @db.Text
  attachmentS3Keys String[] @default([])
  createdAt   DateTime @default(now())

  @@index([responseId, createdAt])
  @@map("marketplace_messages")
}

КОМАНДА:
npx prisma migrate dev --name marketplace
```

---

## KF-4.2. Краткая спецификация (детальный план — после набора 1000+ юзеров)

API: 8 endpoints (CRUD listings, responses, messaging)
UI: 5 страниц (catalog, listing, new, my, dialog)
Модерация: AI-фильтр через YandexGPT + ручная

Используем существующие:
- /companies/[slug] (KF-2) — для отображения карточки подрядчика
- ContractorReview — рейтинги
- Socket.io (если уже есть для чата по проектам Модуля 3) — для real-time messaging
- BullMQ — модерация в фоне

Монетизация:
- Базовое размещение — бесплатно
- Premium boost: 990 ₽/30 дней
- Корпоративные тарифы — приоритет в выдаче

---

# KF-5 — Биржа дефектов (2 недели, вместе с KF-4)

## KF-5.0. Контекст

**Главное:** строится поверх существующего Defect (Модуль 11). Не дублируем.

**Что уже есть:**
- Defect модель (Модуль 11) с полями title, description, category, status, severity, assigneeId
- DefectTemplate с системными шаблонами
- DefectAnnotation (рисование на фото)
- Защитная разработка вокруг requiresSuspension

**Что добавляем:**
1. DefectExchangeListing — обёртка над Defect для публикации на биржу
2. Двусторонний рейтинг
3. Опциональный шаблон субподрядного договора

---

## KF-5.1. Prisma

```
📁 schema.prisma:

model DefectExchangeListing {
  id             String   @id @default(uuid())

  // Связь с существующим Defect
  defectId       String   @unique
  defect         Defect   @relation(fields: [defectId], references: [id], onDelete: Cascade)

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdById    String
  creator        User     @relation("DefectExchangeCreator", fields: [createdById], references: [id])

  region         String
  city           String?
  budgetMin      Float?
  budgetMax      Float?
  urgency        UrgencyLevel
  deadline       DateTime?
  status         DefectListingStatus @default(DRAFT)

  assignedToOrganizationId String?
  assignedToOrganization   Organization? @relation("DefectExchangeAssignee", fields: [assignedToOrganizationId], references: [id])

  // После завершения
  completionPhotoS3Keys String[] @default([])
  completionActExecutionDocId String?  // ссылка на созданный АТУ
  completionAct               ExecutionDoc? @relation(fields: [completionActExecutionDocId], references: [id])

  // Двусторонний рейтинг
  customerRating         Int?  // 1-5, выставляет создатель листинга
  customerReview         String?
  contractorRating       Int?  // 1-5, выставляет исполнитель
  contractorReview       String?

  publishedAt    DateTime?
  completedAt    DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  responses      DefectExchangeResponse[]

  @@index([status, region])
  @@map("defect_exchange_listings")
}

enum UrgencyLevel {
  TODAY
  THIS_WEEK
  THIS_MONTH
  WHEN_POSSIBLE
}

enum DefectListingStatus {
  DRAFT
  PUBLISHED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model DefectExchangeResponse {
  id               String   @id @default(uuid())
  listingId        String
  listing          DefectExchangeListing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  respondingOrganizationId String
  respondingOrganization   Organization @relation("DefectExchangeRespOrg", fields: [respondingOrganizationId], references: [id])
  responderUserId  String
  responder        User @relation("DefectExchangeResponder", fields: [responderUserId], references: [id])
  proposedPrice    Float?
  proposedDeadline DateTime?
  message          String   @db.Text
  status           ResponseStatus @default(NEW)
  createdAt        DateTime @default(now())

  @@index([listingId])
  @@map("defect_exchange_responses")
}

КОМАНДА:
npx prisma migrate dev --name defect_exchange
```

---

## KF-5.2. Интеграция с существующим Defect UI

```
📁 src/components/defects/DefectDetailCard.tsx (РАСШИРИТЬ существующий):

В существующем компоненте добавить кнопку:

<DefectActions>
  <Button onClick={openPublishToExchangeDialog}>
    Передать внешнему подрядчику на устранение
  </Button>
</DefectActions>

Открывает диалог:
<PublishToExchangeDialog>
  <DefectPreview />
  <BudgetField />
  <UrgencyField />
  <RegionField (auto-populated from project.address)>
  <LegalCheckboxes>
    [ ] Я понимаю, что Komplid — площадка объявлений
    [ ] Договор подряда заключу самостоятельно
    [ ] Я готов предоставить доступ на объект
    [ ] За качество отвечаю я (как основной подрядчик)
  </LegalCheckboxes>
  <PublishButton />
</PublishToExchangeDialog>

API:
POST /api/defects/[defectId]/publish-to-exchange
  Body: { region, city, budgetMin, budgetMax, urgency, deadline, legalAccepted: true }
  - Проверить acceptance всех 4 чекбоксов
  - Создать DefectExchangeListing(status=PUBLISHED после ручной модерации, или MODERATION)
  Return: { listingId }
```

---

## KF-5.3. UI каталога

```
📁 ФАЙЛЫ:
- src/app/(dashboard)/defect-exchange/page.tsx (каталог)
- src/app/(dashboard)/defect-exchange/[id]/page.tsx (карточка)
- src/app/(dashboard)/defect-exchange/my/page.tsx (мои)

Каталог отфильтрован по:
- DefectCategory (auto-mapping в Specialization)
- Регион (city из project.address)
- Урочность

Карточка:
- Фото дефекта (existing Photos by entityType=DEFECT)
- Локация (только город, не полный адрес)
- Бюджет (диапазон)
- Срок
- Рейтинг заказчика (агрегированный из предыдущих закрытий)

Завершение работ:
- Загрузка completion photos
- Опционально: создание АТУ через существующий ExecutionDoc workflow
- Двусторонний рейтинг (обязателен после завершения)
```

---

## KF-5.4. Команды Claude Code — KF-5

```bash
npx prisma migrate dev --name defect_exchange
# Расширить существующий DefectDetailCard
# Создать API (6 endpoint)
# Создать каталог /defect-exchange
# Шаблон субподрядного договора через docxtemplater (уже в проекте)
# Тесты
```

**ACCEPTANCE CRITERIA KF-5:**

- [ ] Из карточки Defect — публикация в 2 клика
- [ ] Юридические чекбоксы блокируют публикацию
- [ ] Авто-маппинг DefectCategory → Specialization
- [ ] Двусторонний рейтинг обязателен
- [ ] Шаблон договора генерируется
- [ ] Рейтинг попадает в публичный профиль (KF-2)

---

# KF-6 — Telegram-бот для прораба (1 неделя) ⭐ НОВОЕ В V2

## KF-6.0. Почему отдельная фича

В оригинальном источнике (`портал заказчика и клиента.docx`) Telegram-бот указан как **топ-1 альтернативная фича** с самым высоким ROI:

> "1. Telegram-бот для прораба (1 неделя)
> - Прораб отправляет фото в бот → автоматически попадает в ОЖР
> - Голосовое сообщение → транскрипция → запись в журнал
> - Уведомления о замечаниях прямо в Telegram
> - Почему киллер: прорабы живут в мессенджерах, не в приложениях.
>   Никто из конкурентов так не делает."

В v1-плане я её упустил. Это ошибка — добавляю.

---

## KF-6.1. Что уже есть

- Web Speech API + Yandex SpeechKit (Модуль 16) — для голос-в-текст
- BullMQ — для обработки сообщений из Telegram
- Notification модель — для bridge между in-app и Telegram
- WorkRecord, SpecialJournalEntry, Photo, Defect — для записи входящих

---

## KF-6.2. Prisma

```
📁 schema.prisma:

model TelegramAccount {
  id              String   @id @default(uuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  telegramUserId  String   @unique
  username        String?
  firstName       String?
  lastName        String?
  linkedAt        DateTime @default(now())
  isActive        Boolean  @default(true)
  notificationsEnabled Boolean @default(true)

  // Контекст последнего активного объекта (для записей без явного указания)
  activeProjectId String?
  buildingObject  BuildingObject? @relation(fields: [activeProjectId], references: [id], onDelete: SetNull)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("telegram_accounts")
}

model TelegramMessage {
  id              String   @id @default(uuid())
  telegramAccountId String
  telegramAccount TelegramAccount @relation(fields: [telegramAccountId], references: [id], onDelete: Cascade)
  telegramMessageId String
  type            TelegramMessageType
  content         String?  @db.Text  // текст сообщения или транскрипция голосового
  fileS3Key       String?  // если фото/голосовое
  processedAs     ProcessedEntityType?  // что создано из сообщения
  processedEntityId String?
  errorMessage    String?
  createdAt       DateTime @default(now())

  @@index([telegramAccountId, createdAt])
  @@map("telegram_messages")
}

enum TelegramMessageType {
  TEXT
  PHOTO
  VOICE
  DOCUMENT
  COMMAND
}

enum ProcessedEntityType {
  PHOTO
  JOURNAL_ENTRY
  DEFECT
  WORK_RECORD
  COMMENT
}

КОМАНДА:
npx prisma migrate dev --name telegram_bot
```

---

## KF-6.3. Bot инфраструктура

```
📋 ЗАДАЧА: Telegram-бот как отдельный процесс (по аналогии с Socket.io)

ВАЖНО (из docs/lessons.md):
- Не запускать бота в Next.js API Route
- Отдельный процесс, отдельный package script

📁 ФАЙЛЫ:
- src/bot/telegram/index.ts (entry point)
- src/bot/telegram/commands/* (handlers команд)
- src/bot/telegram/handlers/* (handlers медиа)
- src/lib/telegram/notify.ts (отправка in→bot)

Использовать grammY (более современная альтернатива node-telegram-bot-api):
npm install grammy

src/bot/telegram/index.ts:
import { Bot } from 'grammy';
import { handleStart, handleLink } from './commands/auth';
import { handlePhoto } from './handlers/photo';
import { handleVoice } from './handlers/voice';
import { handleText } from './handlers/text';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.command('start', handleStart);
bot.command('link', handleLink);  // /link <code>
bot.command('object', handleSetActiveObject);  // переключить контекст
bot.command('list', handleListObjects);

bot.on('message:photo', handlePhoto);
bot.on('message:voice', handleVoice);
bot.on('message:text', handleText);

bot.start();

src/bot/telegram/handlers/photo.ts:
export async function handlePhoto(ctx: Context) {
  const tgAccount = await getTelegramAccount(ctx.from.id);
  if (!tgAccount) return ctx.reply('Сначала привяжите аккаунт: /link <код>');
  if (!tgAccount.activeProjectId) return ctx.reply('Выберите объект: /object');

  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const file = await ctx.api.getFile(photo.file_id);
  const buffer = await downloadFile(file.file_path);

  // Загрузить в S3 (используя buildS3Key)
  const s3Key = buildS3Key(orgId, 'photos/telegram', `${Date.now()}.jpg`);
  await uploadFile(buffer, s3Key, 'image/jpeg');

  // Создать Photo (используя существующий API логику)
  const photoRecord = await db.photo.create({
    data: {
      s3Key,
      fileName: `tg-photo-${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      size: buffer.length,
      entityType: 'WORK_RECORD',  // или из контекста активного проекта
      entityId: tgAccount.activeProjectId,
      authorId: tgAccount.userId,
    }
  });

  await ctx.reply(`✅ Фото загружено в проект «${...}»`);
}

src/bot/telegram/handlers/voice.ts:
export async function handleVoice(ctx: Context) {
  const voice = ctx.message.voice;
  const file = await ctx.api.getFile(voice.file_id);
  const buffer = await downloadFile(file.file_path);

  // Транскрипция через Yandex SpeechKit (используем существующий)
  const text = await transcribeAudio(buffer);

  // Создать SpecialJournalEntry в активном объекте/контракте
  // ...

  await ctx.reply(`📝 Запись добавлена в ОЖР: "${text}"`);
}

ПРИВЯЗКА:
В UI на /settings/integrations/telegram:
- Кнопка "Привязать Telegram"
- Генерируется одноразовый код (uuid)
- Юзер пишет боту: /link <код>
- Bot создаёт TelegramAccount

УВЕДОМЛЕНИЯ:
src/lib/telegram/notify.ts:
export async function notifyTelegram(userId: string, payload: { text, replyMarkup? }) {
  const tgAccount = await db.telegramAccount.findUnique({ where: { userId } });
  if (!tgAccount?.notificationsEnabled) return;

  await bot.api.sendMessage(tgAccount.telegramUserId, payload.text, {
    reply_markup: payload.replyMarkup,
  });
}

Интеграция в существующий notification.worker.ts (Модуль 16):
После отправки email/push — также пробуем Telegram если привязан.
```

---

## KF-6.4. Команды Claude Code — KF-6

```bash
npm install grammy

# Команда 1. Миграция
npx prisma migrate dev --name telegram_bot

# Команда 2. Bot инфраструктура
# src/bot/telegram/* (отдельный процесс)
# package.json: "telegram-bot": "tsx src/bot/telegram/index.ts"

# Команда 3. Handlers
# /link, /object, /list
# Photo, Voice, Text

# Команда 4. Webhook или long-polling
# Для prod — webhook через app.komplid.ru/api/telegram/webhook
# Для dev — long polling

# Команда 5. UI
# Страница /settings/integrations/telegram
# Генерация кода привязки
# Список привязанных Telegram

# Команда 6. Интеграция с существующими уведомлениями
# Расширить notification.worker.ts

# Команда 7. ENV переменные
# TELEGRAM_BOT_TOKEN
# TELEGRAM_WEBHOOK_SECRET (для прод)

# Команда 8. Тесты
# Создать тестового бота через @BotFather
# Manual test: /start → /link → отправка фото → проверка в БД
```

**ACCEPTANCE CRITERIA KF-6:**

- [ ] Привязка через одноразовый код работает
- [ ] /list показывает мои объекты
- [ ] /object N переключает активный контекст
- [ ] Фото попадает в Photo с правильным entityId
- [ ] Голосовое расшифровывается через Yandex SpeechKit, попадает в SpecialJournalEntry
- [ ] Текст создаёт запись в ОЖР с командой /journal
- [ ] Уведомления приходят в Telegram (когда включено)
- [ ] Webhook режим работает на prod

---


---

# ОБЩИЕ РАЗДЕЛЫ

## Сводка изменений v1 → v2

Чтобы было понятно, что именно переработано:

| Что | v1 | v2 (с учётом репозитория) |
|---|---|---|
| Имя главной модели объекта | `Project` | `BuildingObject` (с FK `projectId`) |
| `WorkspaceRole` enum | OWNER, ADMIN, MANAGER, FOREMAN, ENGINEER, WORKER, GUEST, CUSTOMER | OWNER, ADMIN, MEMBER, GUEST + добавляем CUSTOMER через ProfiRole в SubscriptionPlan |
| Маршрут публичного дашборда | Новый `/shared/project/[token]` | Расширяем существующий `/portal/[token]` |
| `ProjectPortalToken` | Создавал заново | Расширяем существующий: `scopeType`, `customSettings`, `revokedAt`, `viewCount` |
| Permissions matrix | Своя в `src/lib/permissions/` | Используем существующий `requireFeature` из MODULE15 |
| `CustomerProject` | Новая модель | Не нужна. Используем `BuildingObject` в PERSONAL Workspace |
| OCR с нуля | Свой Yandex Vision клиент | Используем существующий `YANDEX_CLOUD_API_KEY`, добавляем только Vision endpoint |
| AI-юрист | Новая интеграция | Переиспользуем паттерн из `src/lib/estimates/yandex-gpt.ts` |
| `KF-5 биржа дефектов` | Своя `Defect` модель | Поверх существующего `Defect` (Модуль 11) |
| `KF-6 Telegram-бот` | Не было | Добавлен (топ-1 по ROI из источника) |
| API path | `/api/projects/...` или смешанно | Только `/api/projects/[projectId]/*` (правило из `docs/lessons.md`) |
| Фаза 1 длительность | 2 нед | 1.5 нед (страница уже есть) |
| Фаза 2 длительность | 4 нед | 2 нед (GUEST + guestScope уже в схеме) |
| Фаза 3 длительность | 6 нед | 4 нед (без `CustomerProject`) |
| KF-5 длительность | 3 нед | 2 нед (поверх Defect) |
| Workers (BullMQ) | Без оговорок | Обязательный rate-limited error handler (правило `docs/lessons.md`) |

---

## ENV-переменные (что новое, что уже есть)

```bash
# ───────── УЖЕ ЕСТЬ В ПРОЕКТЕ ─────────
DATABASE_URL=                              # PostgreSQL (Timeweb Managed)
REDIS_URL=                                 # Redis (Timeweb Managed)
S3_ENDPOINT=https://s3.twcstorage.ru
S3_REGION=ru-1
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
APP_URL=https://app.komplid.ru
YANDEX_CLOUD_API_KEY=                      # для GPT — будем переиспользовать для Vision (KF-3) и Lawyer (Фаза 3)
YANDEX_FOLDER_ID=
YANDEX_GPT_MODEL=yandexgpt/latest
YANDEX_SPEECHKIT_API_KEY=                  # для голосового ввода — переиспользуем в KF-6
GEMINI_API_KEY=                            # fallback — переиспользуем в KF-1, Фаза 3
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=           # для адресов в Фазе 3
SMTP_HOST=, SMTP_PORT=, SMTP_USER=, SMTP_PASS=, SMTP_FROM=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=, VAPID_PRIVATE_KEY=, VAPID_SUBJECT=

# ───────── ДОБАВИТЬ ДЛЯ MODULE17 ─────────

# SMS-провайдер (Фаза 2 — гостевая SMS-подпись)
SMS_PROVIDER=smsru                         # smsru | smsc | smsaero
SMS_API_KEY=
SMS_SENDER=Komplid

# Dadata (KF-2 — верификация ИНН подрядчика)
DADATA_API_KEY=
DADATA_SECRET=

# Telegram (KF-6)
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=                   # только для прод
TELEGRAM_USE_WEBHOOK=false                 # true в прод, false в dev (long polling)

# Лимиты по тарифам (можно зашить в код, но удобнее env)
OCR_FREE_MONTHLY_LIMIT=5
OCR_TEAM_MONTHLY_LIMIT=100
AI_COMPLIANCE_FREE_MONTHLY_LIMIT=5
AI_COMPLIANCE_TEAM_MONTHLY_LIMIT=50
AI_LAWYER_DAILY_LIMIT=20

# Маркетплейс (KF-4)
MARKETPLACE_AUTO_PUBLISH=false             # на старте — ручная модерация всего
MARKETPLACE_BOOST_PRICE_RUB=990
```

---

## Дорожная карта (с учётом существующего)

```
Месяц 1 (нед. 1-4) — Фундамент виральности
├─ Нед. 1-2  Фаза 1   Расширение /portal/[token]            [параллельно с KF-2]
├─ Нед. 1-2  KF-2     Публичное портфолио подрядчика
├─ Нед. 3-4  KF-1     AI-проверка ИД                        [уровень: используем YandexGPT + 30 правил]
└─ Нед. 4    KF-6     Telegram-бот для прораба              [1 неделя, высокий ROI]

Месяц 2 (нед. 5-8) — Гостевой кабинет + OCR
├─ Нед. 5-6  Фаза 2   Гостевой кабинет                      [GUEST + guestScope уже есть]
├─ Нед. 5-7  KF-3     OCR Yandex Vision                     [параллельно]
└─ Нед. 8    Стабилизация + бета-тестирование с 10-20 подрядчиками

Месяц 3-4 (нед. 9-12) — B2C "Мой Ремонт"
├─ Нед. 9-10  Фаза 3a  Prisma + Subscription plan + AI-юрист
├─ Нед. 11    Фаза 3b  UI + чек-листы + шаблоны претензий
├─ Нед. 12    Фаза 3c  Лендинг /dlya-zakazchika в маркетинге

Месяц 5+ — Стабилизация и рост
└─ Контент-маркетинг (см. MODULE_MARKETING_PLAN), фидбек, оптимизация UX

Месяц 6+ — Маркетплейс (когда 1000+ активных)
├─ Нед. 17-19  KF-4   Маркетплейс
└─ Нед. 19-20  KF-5   Биржа дефектов (поверх Defect)
```

**Параллелизм:**
- Фаза 1 + KF-2 — обе расширяют публичный слой, делятся компонентами
- KF-1 + Фаза 2 — независимы по коду, можно параллельно
- KF-3 + Фаза 2 — тоже независимы, оба используют BullMQ

---

## Связь с другими планами и модулями (с учётом фактического состояния)

| План/Модуль | Состояние | Что используем |
|---|---|---|
| MODULE15 (Подписки) | ✅ Реализован | `requireFeature`, `useFeature`, `FeatureGate`, `getActivePlan`, `SubscriptionPlan.features`. Добавляем новые feature-коды и план `customer_pro`. |
| MODULE16 (PWA + offline) | ✅ Реализован | Гостевой кабинет (Фаза 2) и `/moy-remont` (Фаза 3) автоматически работают офлайн. `CameraCapture` и `VoiceInput` переиспользуются в Фазе 3 и KF-6. |
| Модуль 4 (УП и документы) | ✅ Реализован | `/management/*` уже содержит вкладки Контракты/Документы/Мероприятия/Аналитика. Добавляем 5-ю — «Публичность». |
| Модуль 9 (Журналы) | ✅ Реализован | `SpecialJournal` + `/shared/journal/[token]` используем как пример паттерна publicShareToken. KF-6 пишет в `SpecialJournalEntry`. |
| Модуль 10 (ИД) | ✅ Реализован | `ExecutionDoc`, `IdClosurePackage`, `qrToken` + `/docs/verify/[token]` — переиспользуем для KF-1 и Фазы 1. |
| Модуль 11 (СК) | ✅ Реализован | `Defect`, `DefectTemplate` — фундамент для KF-5. UI расширяем: кнопка «Передать на биржу» в `DefectDetailCard`. |
| Модуль 6 (Сметы) | ✅ Реализован | `EstimateImport`, парсинг XML/Excel, YandexGPT — паттерн для KF-1 и Фазы 3 AI-юриста. |
| Модуль 14 (ИСУП, ЭЦП) | ⬜ Не реализован | Не зависим. KF-1 не требует ЭЦП — `Signature.signatureType=SIMPLE` для гостевых подписей достаточно. |
| MODULE_MARKETING | ✅ Реализован | `/companies/[slug]` для KF-2, `/dlya-zakazchika` для Фазы 3. |
| Модуль 3 (Чат) | ✅ Реализован | Socket.io на 3001 — переиспользуем для KF-4 (внутренний чат маркетплейса). KF-6 Telegram — отдельный процесс, в Socket.io не трогаем. |

---

## Риски и митигации (учётом конкретики кода)

| Риск | Митигация |
|---|---|
| Подрядчик саботирует публичность (боится показать проблемы) | Фото с категорией `VIOLATION` (используется существующий `PhotoCategory`) автоматически скрываются. Денежные суммы скрыты по умолчанию. |
| Permissions matrix v1 пересекается с MODULE15 | Не делаем. Используем `requireFeature` + проверку `WorkspaceMember.role` (как в существующих API типа `/api/projects/[projectId]/portal-token/route.ts`). |
| YandexGPT отвалился при AI-проверке | Используем тот же fallback что в `parseChunkWithYandexGpt` → Gemini. Уже работает. |
| Yandex Vision лимиты (KF-3) | Лимит на план: Free 5, Team 100, Corporate -1. Стоимость отображается в UI до запуска. |
| BullMQ воркеры спамят логами при недоступном Redis | **Обязательно** rate-limited error handler (см. `docs/lessons.md`). Worker запускать только после `redis.ping()`. |
| Telegram-бот падает или Telegram блокирует webhook | Long polling в dev, webhook + Bearer secret в прод. Health-check endpoint. Не критичная фича — основной flow не ломается. |
| Маркетплейс пуст на старте | НЕ запускать пока нет 1000+ активных. До этого — KF-2 (портфолио) даёт похожую социальную функциональность через SEO. |
| Юр. риски маркетплейса/биржи | Дисклеймеры в оферте + 4 чекбокса перед публикацией. AI-фильтр через YandexGPT для проверки на нарушения. |
| Параллельная разработка ломает API | Все API под `/api/projects/[projectId]/*` (правило `docs/lessons.md`). PR-ревью обязательно проверяет что не создан путь `/api/objects/`. |
| Миграции конфликтуют с уже работающими backfill-ами MODULE15 | Каждая миграция Module17 — отдельным PR. Перед мерджем — `npx prisma migrate status` на staging. |

---

## Чек-лист предусловий перед стартом

Это блокер. Без зелёных галочек не стартовать:

- [ ] MODULE15 (Подписки) смержен в main, `getActivePlan` работает
- [ ] MODULE16 (PWA + push) — частично достаточно (хотя бы Фазы 1-3: SW, IDB, sync-queue)
- [ ] Модули 9, 10, 11 в продакшене (нужны Photo, ExecutionDoc, Defect для KF и Фаз)
- [ ] BullMQ инфраструктура работает (есть рабочий пример воркера)
- [ ] Yandex Cloud аккаунт оплачен, IAM-token валиден
- [ ] Staging-окружение с **независимой** БД (не делиться с prod)
- [ ] Backup prod-БД сделан **прямо перед** запуском первой миграции
- [ ] SMS-провайдер выбран (минимум для Фазы 2)
- [ ] Dadata API-ключ получен (для KF-2 верификации ИНН)

---

## Финальная команда работы с Claude Code

**Правило (то же, что в v1):** один раздел → одна feature-branch → один PR → ревью → staging → следующий раздел.

**Конкретный порядок отдачи в Claude Code:**

```
Sprint 1 (нед. 1-2):
  1.1 Prisma extend ProjectPortalToken          → PR1
  1.2 API публичного дашборда (6 endpoints)     → PR2
  1.3 UI расширение /portal/[token]             → PR3
  1.4 UI /management/publicity                  → PR4

В параллель той же командой (другой разработчик):
  KF-2.1 Prisma contractor profile              → PR5
  KF-2.2 API public/contractors/[slug]          → PR6
  KF-2.3 UI настройки + интеграция /companies   → PR7

Sprint 2 (нед. 3-4):
  KF-1.1 Prisma ai_compliance                   → PR8
  KF-1.2 Engine + 30 rules + worker             → PR9
  KF-1.3 UI compliance                          → PR10
  KF-6.1 Prisma + bot infrastructure            → PR11
  KF-6.2 Handlers + Yandex SpeechKit integration → PR12

Sprint 3-4 (нед. 5-8):
  Фаза 2 (4 PR последовательно)
  KF-3 (3 PR в параллель)

Sprint 5-6 (нед. 9-12):
  Фаза 3 (5-6 PR)
  + лендинг в komplid-marketing

Sprint 7+ (через 6+ месяцев):
  KF-4 + KF-5 (когда 1000+ активных)
```

**Каждое задание для Claude Code начинать с:**

> «Прочитай `CLAUDE.md`, `ROADMAP.md` и `docs/lessons.md`.
> Затем прочитай текущую `prisma/schema.prisma` и существующие API в
> `src/app/api/projects/[projectId]/`.
> Задание ниже…»

Это даёт Claude Code полный контекст архитектурных решений, чтобы он не пытался создавать `model Project` или путь `/api/objects/`.

---

## Что точно НЕ делать (наследие v1, которое надо не повторять)

1. **Не создавать `model Project`.** Главная сущность — `BuildingObject`. FK называется `projectId`. Это исторически и **переименовывать нельзя**.

2. **Не создавать `/api/objects/[objectId]/*` пути.** Только `/api/projects/[projectId]/*`. Если в существующем коде ещё остались `/api/objects/` — это технический долг, описанный в `docs/lessons.md`, и не повод для повторения.

3. **Не создавать свою permissions matrix.** Используем существующий `requireFeature` + `WorkspaceMember.role` проверки. Если нужна сложная логика — добавляем feature-код, не свой ACL.

4. **Не создавать `model CustomerProject`.** B2C-объекты живут в `BuildingObject` в PERSONAL Workspace.

5. **Не расширять `WorkspaceRole` enum** до FOREMAN/ENGINEER/MANAGER. Текущая семантика `OWNER | ADMIN | MEMBER | GUEST` достаточна. Конкретные специализации — через `User.position` и через специализированные модели (`Defect.assigneeId`, `Inspection.inspectorId`, `TaskRole`).

6. **Не запускать BullMQ-воркер без rate-limited error handler.** Вечный спам логов при недоступном Redis — главное правило из `docs/lessons.md`.

7. **Не запускать Telegram-бот в Next.js API Route.** Только отдельный процесс (по аналогии с Socket.io на 3001).

8. **Не дублировать QR-инфраструктуру.** В Модуле 10 уже есть `qrToken` на `ExecutionDoc` + публичная страница `/docs/verify/[token]`. Это переиспользуется как есть.

9. **Не делать свои CameraCapture/VoiceInput.** Уже реализованы в Модуле 16. Импортируются прямо из `@/components/pwa/`.

10. **Не делать `<PaywallGate>` v2.** Используем существующие `<FeatureGate>` + `requireFeature`. Только добавляем новые feature-коды.

---

_Документ закрыт._
_Версия 2.0 — модернизация v1 после полного аудита репозитория._
_Готов к передаче в Claude Code с указанной выше последовательностью PR._

