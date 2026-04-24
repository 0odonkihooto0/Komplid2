# MODULE17_PLAN.md — Портал заказчика и Killer-фичи

> **Репозиторий:** `stroydocs/` (основное приложение, `app.komplid.ru`)
> **Стек:** Next.js 15 App Router + TypeScript + Prisma + PostgreSQL + Tailwind + shadcn/ui
> **Зависимости от уже реализованного:**
> - `MODULE15_PLAN.md` — Подписки и Профи-пакеты (Сметчик-Студио, ИД-Мастер, Прораб-Журнал)
> - `MODULE16_PLAN.md` — Реферальная программа и UTM-аналитика
> - `SUBSCRIPTION_SYSTEM.md` — Тарифная модель, SubscriptionPlan, SubscriptionFeature
> - `MODULE_MARKETING_PLAN.md` — Маркетинг-сайт `komplid.ru` (отдельный репо)
> - Существующие модели Prisma: `ProjectPortalToken`, `WorkspaceRole` (включая `GUEST` с `guestScope: Json`), `/shared/execution-doc/[token]`, `/docs/verify/[token]`
>
> **Цель плана:** Дать Claude Code пошаговые команды (копируй-вставляй) для:
> 1. Полного портала заказчика в 3 фазы
> 2. Пяти killer-фич, вытекающих из исследования
>
> **Общий бюджет:** 11-14 недель разработки (часть фич идёт параллельно)

---

## 0. Карта фаз и приоритеты

```
┌─────────────────────────────────────────────────────────────────────┐
│ БЛОК A — ПОРТАЛ ЗАКАЗЧИКА                                           │
├─────────────────────────────────────────────────────────────────────┤
│ Фаза 1  │ Публичные дашборды по ссылке       │ 2 нед  │ СЕЙЧАС      │
│ Фаза 2  │ Гостевой кабинет (GUEST UI)        │ 4 нед  │ после 50 PS │
│ Фаза 3  │ «Мой Ремонт» B2C позиционирование  │ 6 нед  │ через 3-6 м │
├─────────────────────────────────────────────────────────────────────┤
│ БЛОК B — KILLER-ФИЧИ                                                │
├─────────────────────────────────────────────────────────────────────┤
│ KF-1    │ AI-проверка комплектности ИД       │ 2 нед  │ параллельно │
│ KF-2    │ Публичное портфолио подрядчика     │ 1 нед  │ с Фазой 1   │
│ KF-3    │ OCR сканов актов (Yandex Vision)   │ 3 нед  │ параллельно │
│ KF-4    │ Маркетплейс субподрядчиков         │ 4 нед  │ после 1000+ │
│ KF-5    │ Биржа дефектов/замечаний           │ 3 нед  │ вместе с KF4│
└─────────────────────────────────────────────────────────────────────┘
```

**Порядок запуска (рекомендация):**

1. **Неделя 1-2:** Фаза 1 (публичные дашборды) + KF-2 (портфолио подрядчика) параллельно — обе расширяют `ProjectPortalToken`, код переиспользуется
2. **Неделя 3-4:** KF-1 (AI-проверка ИД) параллельно с началом Фазы 2
3. **Неделя 5-7:** Фаза 2 (гостевой кабинет) + KF-3 (OCR) параллельно
4. **Неделя 8-13:** Фаза 3 (Мой Ремонт)
5. **После 1000+ активных аккаунтов:** KF-4 + KF-5 (маркетплейс и биржа дефектов)

---

## 0.1. Общие принципы для команд Claude Code

Каждую фазу/фичу Claude Code получает в виде:

```
📋 ЗАДАЧА: <название>
📁 КОНТЕКСТ: <ссылки на существующий код>
🎯 ЦЕЛЬ: <что должно работать в конце>

ШАГИ:
1. Изменения в prisma/schema.prisma — <код>
2. Миграция: npx prisma migrate dev --name <имя>
3. API-эндпоинты: <пути и спецификации>
4. UI: <пути и компоненты>
5. Тесты: <что проверить>

ACCEPTANCE CRITERIA:
- [ ] <проверка 1>
- [ ] <проверка 2>
```

**Общие требования ко всему коду:**

- TypeScript strict mode
- Все API — Next.js route handlers в `src/app/api/`
- Zod-валидация входных параметров
- Prisma-транзакции для атомарности
- Логирование через существующий `src/lib/logger.ts`
- Ошибки в формате `{ error: { code, message } }` с i18n-ключами
- Все UI-страницы адаптивны (mobile-first)
- Соответствие дизайн-токенам из `src/app/globals.css`

---

# ЧАСТЬ I — ПОРТАЛ ЗАКАЗЧИКА

# ФАЗА 1 — Публичные дашборды по ссылке (2 недели)

## 1.0. Контекст

**Что уже есть:**
- Модель `ProjectPortalToken` с полями `token: String @unique`, `projectId`, `expiresAt`, `scope: Json`
- Роут `/shared/execution-doc/[token]` показывает сметы по публичной ссылке
- Роут `/docs/verify/[token]` валидирует ИД-документы через QR
- `WorkspaceRole.GUEST` объявлена, но UI для неё отсутствует

**Что добавляем в Фазе 1:**
- Расширяем `ProjectPortalToken.scope` — новые режимы `"project_dashboard"`, `"contractor_portfolio"` (последний — для KF-2)
- Новый роут `/shared/project/[token]` — публичный дашборд объекта
- Управление публичностью в UI проекта: `Project Settings → Publicity`
- Промо-блок Komplid внизу каждого публичного дашборда (для виральности)

**Что явно НЕ делаем в этой фазе:**
- Авторизация заказчика (это Фаза 2)
- Денежные суммы на публичной странице (только прогресс в %)
- Индексация в поисковиках публичных дашбордов активных объектов (только завершённых)

---

## 1.1. Изменения в Prisma-схеме

```
📋 ЗАДАЧА: Расширить ProjectPortalToken для публичного дашборда

📁 ФАЙЛ: prisma/schema.prisma

ШАГ 1. Добавить enum PortalTokenScope в schema.prisma (если его ещё нет)
как отдельный тип, не трогая существующее поле scope: Json:

enum PortalTokenScope {
  EXECUTION_DOC       // уже используется
  PROJECT_DASHBOARD   // новый — публичный дашборд объекта
  CONTRACTOR_PORTFOLIO // новый — страница подрядчика, см. KF-2
  CUSTOMER_GUEST       // новый, будет использоваться в Фазе 2
}

ШАГ 2. В модели ProjectPortalToken добавить поля:

model ProjectPortalToken {
  // ... существующие поля
  scopeType         PortalTokenScope @default(EXECUTION_DOC)
  allowIndexing     Boolean          @default(false)  // разрешить robots.txt
  viewCount         Int              @default(0)
  lastViewedAt      DateTime?
  customSettings    Json?            // { hideCosts: true, hidePhotos: [...] }
  revokedAt         DateTime?
  revokedReason     String?

  @@index([scopeType, projectId])
}

ШАГ 3. Добавить модель PortalView для аналитики:

model PortalView {
  id            String   @id @default(cuid())
  tokenId       String
  token         ProjectPortalToken @relation(fields: [tokenId], references: [id], onDelete: Cascade)
  viewedAt      DateTime @default(now())
  ipHash        String   // sha256(ip + daily_salt) — для GDPR
  userAgent     String?
  referer       String?
  countryCode   String?  @db.VarChar(2)

  @@index([tokenId, viewedAt])
}

ШАГ 4. Добавить связь в модель Project:

model Project {
  // ... существующие поля
  publicDashboardEnabled  Boolean  @default(false)
  publicDashboardSettings Json?    // настройки того, что показывать
}

КОМАНДА МИГРАЦИИ:
npx prisma migrate dev --name portal_token_dashboard
npx prisma generate
```

---

## 1.2. API-эндпоинты Фазы 1

```
📋 ЗАДАЧА: Создать API для управления публичным дашбордом

📁 ФАЙЛЫ:
- src/app/api/projects/[projectId]/publicity/route.ts
- src/app/api/public/projects/[token]/route.ts
- src/app/api/public/projects/[token]/view/route.ts
- src/app/api/public/projects/[token]/photos/route.ts
- src/app/api/public/projects/[token]/progress/route.ts

СПЕЦИФИКАЦИЯ:

1) POST /api/projects/[projectId]/publicity
   Body: {
     enabled: boolean,
     hideCosts: boolean,
     hidePhotoIds: string[],
     expiresInDays?: number,  // null = навсегда
     allowIndexing: boolean
   }
   Auth: WorkspaceRole.OWNER или ADMIN
   Return: { token: string, publicUrl: string }

2) DELETE /api/projects/[projectId]/publicity
   Отзывает все активные PROJECT_DASHBOARD-токены проекта
   Auth: OWNER/ADMIN
   Return: { revokedCount: number }

3) GET /api/public/projects/[token]
   Публичный, без авторизации
   Валидирует токен, проверяет revokedAt и expiresAt
   Return: {
     project: {
       name, address, startDate, plannedEndDate, status,
       area?, stages: [...], contractor: { name, logoUrl? }
     },
     progress: {
       overallPercent: number,
       byStage: [{ name, percent, status }]
     },
     lastUpdate: ISO,
     lastKeyEvents: [{ date, title, description }]
   }
   Поля отфильтрованы по customSettings

4) POST /api/public/projects/[token]/view
   Фиксирует просмотр (без сессии)
   Увеличивает viewCount, создаёт PortalView
   Return: { ok: true }

5) GET /api/public/projects/[token]/photos?limit=20&cursor=
   Пагинированная галерея фото
   Исключает фото из customSettings.hidePhotoIds
   Исключает фото, помеченные как private
   Return: { items: [...], nextCursor: string|null }

6) GET /api/public/projects/[token]/progress
   Возвращает временной ряд прогресса для графика
   Return: {
     points: [{ date, percent }],
     milestones: [{ date, title }]
   }

ВАЖНО:
- Все /api/public/* работают без сессии и без CORS-ограничений
- Rate limit: 60 req/мин/IP через существующий rateLimit middleware
- Логируем каждый просмотр с хешем IP (GDPR-совместимо)
```

---

## 1.3. Страница `/shared/project/[token]`

```
📋 ЗАДАЧА: Создать публичный дашборд объекта

📁 ФАЙЛ: src/app/shared/project/[token]/page.tsx

СТРУКТУРА СТРАНИЦЫ:

<ProjectPublicLayout>
  <ProjectHero>
    — Название + адрес + статус ("В работе" / "Завершён")
    — Период: "март 2026 — декабрь 2026"
    — Подрядчик (название + логотип, если есть)
    — Кнопка "Проверить через QR" (ведёт на /docs/verify)
  </ProjectHero>

  <ProgressOverview>
    — Общий прогресс: большой круговой график
    — По этапам: горизонтальный список с процентами
    — Последнее обновление
  </ProgressOverview>

  <PhotoGallery>
    — Lightbox с пагинацией (infinite scroll)
    — Фото сгруппированы по датам
    — EXIF-данные скрыты
    — Кнопка "Хочу такой же дневник стройки → app.komplid.ru"
  </PhotoGallery>

  <KeyEventsTimeline>
    — Вертикальный timeline с ключевыми событиями
    — Только публичные этапы (не внутренние замечания)
  </KeyEventsTimeline>

  <VerifiedDocumentsBadge>
    — Счётчик: "Подписано X актов скрытых работ"
    — QR-коды на проверку каждого ключевого документа
    — Ссылки на /docs/verify/[id]
  </VerifiedDocumentsBadge>

  <PromoBlock>
    — "Хотите вести свою стройку так же прозрачно?"
    — CTA: "Попробовать Komplid бесплатно → app.komplid.ru"
    — Только для публичных страниц, не показывать если referer
      содержит komplid.ru
  </PromoBlock>

  <Footer>
    — Генерируется автоматически подрядчиком в Komplid
    — Ссылка на главный сайт
  </Footer>
</ProjectPublicLayout>

ТРЕБОВАНИЯ К SEO:
- <title>Объект "{name}" — прогресс строительства — Komplid</title>
- <meta name="description"> с кратким описанием прогресса
- OpenGraph-картинка — первое фото галереи с оверлеем логотипа
- Schema.org: ConstructionEvent + Place (GeoCoordinates)
- robots: "noindex,nofollow" если allowIndexing=false,
  иначе "index,follow" (для завершённых объектов)

SSG/ISR:
- generateStaticParams() возвращает только indexable токены завершённых
  проектов
- revalidate: 3600 (раз в час) для активных, 86400 для завершённых
- На стороне клиента useSWR для последних фото и прогресса

КОМПОНЕНТЫ:
- src/components/public-project/ProjectHero.tsx
- src/components/public-project/ProgressOverview.tsx
- src/components/public-project/PhotoGallery.tsx
- src/components/public-project/KeyEventsTimeline.tsx
- src/components/public-project/VerifiedDocumentsBadge.tsx
- src/components/public-project/PromoBlock.tsx
```

---

## 1.4. UI управления публичностью в приложении

```
📋 ЗАДАЧА: Добавить вкладку "Публичность" в настройки проекта

📁 ФАЙЛЫ:
- src/app/(app)/projects/[id]/settings/publicity/page.tsx
- src/components/project/PublicitySettings.tsx
- src/components/project/PublicDashboardPreview.tsx

СТРУКТУРА UI:

<PublicitySettings>
  <EnableToggle>
    Переключатель "Разрешить публичный доступ"
    При включении — создаётся PROJECT_DASHBOARD-токен
  </EnableToggle>

  <PublicUrlCard>
    Отображает URL: https://app.komplid.ru/shared/project/{token}
    Кнопки: "Копировать ссылку", "Открыть в новой вкладке",
            "Скачать QR-код", "Поделиться в Telegram/WhatsApp"
  </PublicUrlCard>

  <VisibilitySettings>
    Чекбоксы:
    ☐ Скрыть суммы договора и смет
    ☐ Скрыть имена прорабов и заказчиков
    ☐ Скрыть адрес (показывать только город)
    ☐ Скрыть фото с замечаниями
    ☐ Показывать только завершённые этапы
    Разрешить индексацию поисковиками (только для завершённых)
  </VisibilitySettings>

  <SelectivePhotoHiding>
    Сетка всех фото проекта
    Кликом можно пометить конкретное фото как "не показывать публично"
  </SelectivePhotoHiding>

  <ExpirySettings>
    Срок действия ссылки:
    ◉ Бессрочно
    ○ 30 дней
    ○ 90 дней
    ○ До конца проекта
    ○ Конкретная дата...
  </ExpirySettings>

  <AnalyticsPreview>
    Счётчик просмотров + график по дням
    Источники трафика (referer)
    Страны (из IP)
  </AnalyticsPreview>

  <PreviewButton>
    Открывает публичный дашборд в режиме превью
    (с бейджем "Так это видит заказчик")
  </PreviewButton>

  <RevokeButton variant="destructive">
    "Отозвать публичную ссылку" — с подтверждением
  </RevokeButton>
</PublicitySettings>

ROLE CHECK:
- Видит только OWNER или ADMIN workspace
- Для остальных ролей — редирект на 403
```

---

## 1.5. Команды для Claude Code — Фаза 1

```bash
# Команда 1. Prisma-миграция
cd stroydocs
# Применить изменения из раздела 1.1
npx prisma migrate dev --name portal_token_dashboard
npx prisma generate

# Команда 2. API-эндпоинты
# Создать файлы из раздела 1.2 (6 route.ts)
# Использовать существующий requireRole() из src/lib/auth.ts
# Использовать существующий rateLimit() middleware

# Команда 3. Публичная страница
# Создать src/app/shared/project/[token]/page.tsx и 6 компонентов
# из раздела 1.3. Использовать shadcn/ui компоненты Card,
# Progress, Badge, Dialog для лайтбокса

# Команда 4. UI управления публичностью
# Создать страницу settings/publicity и компонент PublicitySettings
# Добавить пункт "Публичность" в навигацию настроек проекта

# Команда 5. Тесты
npm run test -- --testPathPattern=publicity
# E2E: открыть публичную ссылку в инкогнито → видеть данные
# E2E: отозвать ссылку → при открытии видеть 404 с пояснением

# Команда 6. Мета-теги и OG
# Обновить generateMetadata() на странице /shared/project/[token]
# Добавить OG-превью через @vercel/og или next/og
```

**ACCEPTANCE CRITERIA Фазы 1:**

- [ ] Пользователь OWNER может включить/отключить публичность проекта
- [ ] Публичная ссылка открывается в инкогнито без авторизации
- [ ] На публичной странице видны только те данные, которые разрешил владелец
- [ ] Суммы договора/смет НЕ видны если `hideCosts: true`
- [ ] Фото с `privateFlag=true` не отображаются
- [ ] Просмотры логируются, владелец видит счётчик и график
- [ ] Отзыв ссылки работает: токен помечается `revokedAt`, страница возвращает 410
- [ ] QR-коды на документах ведут на `/docs/verify/[token]` и валидны
- [ ] Lighthouse > 90 на публичной странице
- [ ] Schema.org валиден (Rich Results Test)
- [ ] robots-meta корректная: noindex для активных, index для завершённых (если разрешено)

---

# ФАЗА 2 — Гостевой кабинет (4 недели)

## 2.0. Контекст

**Что уже есть:**
- `WorkspaceRole.GUEST` и `guestScope: Json` объявлены в схеме
- Приглашения через email для обычных ролей работают (`WorkspaceInvitation`)

**Что добавляем в Фазе 2:**
- Приглашение заказчика как GUEST через email/SMS/ссылку
- Отдельный UI-layout для GUEST (упрощённый, без левого меню разделов)
- Страница просмотра своего фронта работ
- Комментарии и вопросы без изменения данных
- Подпись КС-2 через простой ЭЦП / СМС-подтверждение
- Уведомления (email + Telegram bot, если привязан) о прогрессе

**Что явно НЕ делаем:**
- Платные функции для гостей (гости всегда бесплатны)
- Управление настройками проекта от лица гостя
- Редактирование ИД от лица гостя

---

## 2.1. Изменения в Prisma-схеме

```
📋 ЗАДАЧА: Расширить модели для гостевого доступа

📁 ФАЙЛ: prisma/schema.prisma

ШАГ 1. Уточнить структуру guestScope в WorkspaceMember:

// Типизация guestScope (в TS, не в Prisma):
// {
//   scope: "FULL" | "CONTRACT_ONLY",
//   contractId?: string,      // если CONTRACT_ONLY
//   allowedProjectIds: string[],
//   permissions: {
//     canViewPhotos: boolean,
//     canViewDocuments: boolean,
//     canComment: boolean,
//     canSignActs: boolean,
//     canViewCosts: boolean,
//   },
//   signatureMethod: "SMS" | "EMAIL_CONFIRM" | "SIMPLE_ECP"
// }

ШАГ 2. Модель GuestInvitation для отправки приглашений:

model GuestInvitation {
  id             String   @id @default(cuid())
  workspaceId    String
  workspace      Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  projectId      String?
  contractId     String?
  email          String?
  phone          String?
  fullName       String
  scope          Json     // структура из шага 1
  token          String   @unique @default(cuid())
  status         GuestInvitationStatus @default(PENDING)
  sentAt         DateTime @default(now())
  acceptedAt     DateTime?
  expiresAt      DateTime
  createdBy      String
  creator        User     @relation(fields: [createdBy], references: [id])

  @@index([workspaceId, status])
  @@index([token])
}

enum GuestInvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}

ШАГ 3. Модель GuestComment для комментариев гостя:

model GuestComment {
  id           String   @id @default(cuid())
  workspaceId  String
  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  projectId    String
  project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  authorUserId String
  author       User     @relation(fields: [authorUserId], references: [id])
  targetType   GuestCommentTarget
  targetId     String   // id фото / документа / этапа
  content      String
  status       GuestCommentStatus @default(OPEN)
  resolvedBy   String?
  resolvedAt   DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([projectId, status])
}

enum GuestCommentTarget {
  PHOTO
  DOCUMENT
  STAGE
  ESTIMATE
  GENERAL
}

enum GuestCommentStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  DISMISSED
}

ШАГ 4. Модель GuestSignature для подписей актов:

model GuestSignature {
  id              String   @id @default(cuid())
  workspaceId     String
  documentId      String   // связь с существующим Document
  signerUserId    String
  signer          User     @relation(fields: [signerUserId], references: [id])
  method          SignatureMethod
  confirmationCode String?
  confirmedAt     DateTime?
  ipAddress       String
  userAgent       String
  ecpFingerprint  String?  // если через простой ЭЦП
  auditTrail      Json     // полный журнал действий
  status          SignatureStatus @default(PENDING)
  createdAt       DateTime @default(now())

  @@index([documentId])
}

enum SignatureMethod {
  SMS
  EMAIL_CONFIRM
  SIMPLE_ECP
  NONE
}

enum SignatureStatus {
  PENDING
  CONFIRMED
  REJECTED
  EXPIRED
}

КОМАНДА МИГРАЦИИ:
npx prisma migrate dev --name guest_portal
npx prisma generate
```

---

## 2.2. API-эндпоинты Фазы 2

```
📋 ЗАДАЧА: Полный CRUD для гостевого кабинета

📁 ФАЙЛЫ:
- src/app/api/workspaces/[id]/guests/invitations/route.ts (POST, GET)
- src/app/api/workspaces/[id]/guests/invitations/[invId]/route.ts (DELETE)
- src/app/api/public/guest-accept/[token]/route.ts (GET, POST)
- src/app/api/guest/me/route.ts (GET)
- src/app/api/guest/projects/[id]/route.ts (GET, comments CRUD)
- src/app/api/guest/documents/[id]/sign/route.ts (POST)
- src/app/api/guest/signatures/confirm/route.ts (POST — подтверждение SMS)

СПЕЦИФИКАЦИЯ ОСНОВНЫХ:

1) POST /api/workspaces/[id]/guests/invitations
   Body: {
     fullName: string,
     email?: string,
     phone?: string,
     projectId?: string,
     contractId?: string,
     scope: GuestScope,   // см. типизацию выше
     expiresInDays: number  // default 30
   }
   Проверка: либо email, либо phone
   Создаёт GuestInvitation, отправляет email/SMS со ссылкой на
   /accept-guest/[token]
   Return: { invitationId, token }

2) GET /api/public/guest-accept/[token]
   Публичный. Возвращает данные о приглашении для формы принятия
   Return: {
     workspaceName, projectName, inviterName,
     scope, expiresAt, hasAccount: boolean
   }

3) POST /api/public/guest-accept/[token]
   Body: { password?: string, acceptEula: true }
   — Если у пользователя уже есть аккаунт — добавляется членство
     WorkspaceMember(role=GUEST, guestScope из invitation)
   — Если нет — создаётся новый User + членство
   — Возвращает JWT-сессию
   Return: { sessionToken, userId, redirectTo: "/guest" }

4) POST /api/guest/documents/[id]/sign
   Body: { method: SignatureMethod }
   Для SMS: отправляет 6-значный код на телефон гостя
   Для EMAIL_CONFIRM: отправляет ссылку-подтверждение
   Создаёт GuestSignature в PENDING
   Return: { signatureId, expiresIn: 600 }

5) POST /api/guest/signatures/confirm
   Body: { signatureId: string, code: string }
   Проверяет код, переводит в CONFIRMED
   Присоединяет подпись к документу
   Отправляет уведомление подрядчику
   Возвращает обновлённый документ

ВАЖНО:
- Все /api/guest/* требуют сессии с role=GUEST
- Проверка доступа к данным через guestScope:
  если GUEST запросил данные вне allowedProjectIds — 403
- При попытке модификации чего-либо кроме комментариев — 403
- В WorkspaceInvitation уже есть похожая логика, переиспользовать
  хелперы из src/lib/invitations.ts
```

---

## 2.3. UI гостевого кабинета

```
📋 ЗАДАЧА: Отдельный layout для GUEST-роли

📁 ФАЙЛЫ:
- src/app/(guest)/layout.tsx — отдельный layout
- src/app/(guest)/guest/page.tsx — дашборд гостя
- src/app/(guest)/guest/projects/[id]/page.tsx
- src/app/(guest)/guest/projects/[id]/photos/page.tsx
- src/app/(guest)/guest/projects/[id]/documents/page.tsx
- src/app/(guest)/guest/projects/[id]/comments/page.tsx
- src/app/(guest)/guest/signatures/page.tsx
- src/app/accept-guest/[token]/page.tsx — страница принятия приглашения

ПРАВИЛА ДОСТУПА:
- Middleware src/middleware.ts проверяет:
  - Если user.role === GUEST → маршрут должен начинаться с /guest/
    или /accept-guest/
  - Если обычный user пытается попасть на /guest → редирект на /app

СТРУКТУРА LAYOUT:

<GuestLayout>
  <GuestHeader>
    — Логотип Komplid (мельче, чтобы не перепутать с обычным UI)
    — Название подрядчика ("Вы в кабинете от ООО Стройка+")
    — Переключатель объектов (если > 1)
    — Уведомления (колокольчик)
    — Профиль (выход)
  </GuestHeader>

  <GuestMain>
    {children}
  </GuestMain>

  <GuestFooter>
    — "Этот кабинет предоставлен подрядчиком через Komplid"
    — "Хотите свой кабинет подрядчика? → app.komplid.ru/signup"
  </GuestFooter>
</GuestLayout>

ДАШБОРД ГОСТЯ (/guest):

<GuestDashboard>
  <WelcomeCard name={user.fullName} />

  <MyProjectsGrid>
    — Карточки проектов с guestScope.allowedProjectIds
    — На каждой: название, фото-превью, прогресс %, статус
  </MyProjectsGrid>

  <RecentUpdates>
    — Лента последних событий: новое фото, подписан акт, ответ на
      комментарий
    — Можно кликнуть — откроется соответствующая сущность
  </RecentUpdates>

  <PendingActions>
    — "Подпишите КС-2 от 15.03.2026" — CTA кнопка
    — "Ответьте на вопрос подрядчика" — CTA кнопка
  </PendingActions>
</GuestDashboard>

СТРАНИЦА ПРОЕКТА ДЛЯ ГОСТЯ (/guest/projects/[id]):
— Переиспользуем компоненты из /shared/project/[token] (Фаза 1)
— Добавляем вкладки: Фото, Документы, Комментарии, Подписи, Сметы
  (если permissions.canViewCosts)
— Каждая вкладка учитывает guestScope.permissions

ПОДПИСЬ ДОКУМЕНТА (/guest/documents/[id]/sign):

<SignDocumentWizard>
  <Step1ReviewDocument>
    — PDF-превью документа (через pdf.js)
    — Кнопка "Я прочитал и согласен подписать"
  </Step1ReviewDocument>

  <Step2ChooseMethod>
    — Если phone есть → SMS (по умолчанию)
    — Email-подтверждение
    — Простой ЭЦП (если есть setup)
  </Step2ChooseMethod>

  <Step3Confirm>
    — Поле ввода 6-значного кода
    — Таймер "Отправить повторно через 60 сек"
    — При успехе → toast + редирект на список подписей
  </Step3Confirm>
</SignDocumentWizard>

КОМПОНЕНТЫ:
- src/components/guest/GuestHeader.tsx
- src/components/guest/GuestDashboard.tsx
- src/components/guest/MyProjectsGrid.tsx
- src/components/guest/RecentUpdates.tsx
- src/components/guest/PendingActions.tsx
- src/components/guest/SignDocumentWizard.tsx
- src/components/guest/GuestComments.tsx
- src/components/guest/AcceptInvitationForm.tsx
```

---

## 2.4. Уведомления гостям

```
📋 ЗАДАЧА: Отправка уведомлений гостям

📁 ФАЙЛЫ:
- src/lib/notifications/guest.ts
- src/app/api/webhooks/guest-notify/route.ts

СЦЕНАРИИ УВЕДОМЛЕНИЙ:

1) Новое фото в проекте → email + push (если PWA установлено)
2) Новый документ на подпись → email + SMS
3) Ответ на комментарий гостя → email
4) Новый этап завершён → email (дайджест раз в день, не чаще)
5) Приближение срока договора → email за 7 и 1 день

НАСТРОЙКИ УВЕДОМЛЕНИЙ (/guest/settings/notifications):
— Гость может отключить любой канал
— Обязательно остаётся только "Документ на подпись"

TELEGRAM BOT (если есть):
— Гость может привязать Telegram через /start <linkCode>
— Тогда уведомления дублируются в Telegram
— Используем существующий bot framework из основного приложения

ИСПОЛЬЗОВАТЬ:
- src/lib/email/sendTransactional.ts (уже есть)
- src/lib/sms/sendSms.ts (если уже реализовано)
- Шаблоны email в src/emails/guest/
```

---

## 2.5. Команды для Claude Code — Фаза 2

```bash
# Команда 1. Миграция
npx prisma migrate dev --name guest_portal
npx prisma generate

# Команда 2. API-эндпоинты (7 файлов)
# Создать по спецификации из 2.2, переиспользовать requireRole

# Команда 3. Middleware
# Обновить src/middleware.ts для GUEST-редиректов

# Команда 4. UI
# Создать новую route group (guest) со своим layout
# Создать 5 страниц + 8 компонентов из 2.3
# Переиспользовать компоненты из Фазы 1 где возможно

# Команда 5. Email-шаблоны
# Создать 5 шаблонов в src/emails/guest/
# (invite.tsx, new-photo.tsx, sign-request.tsx,
# comment-reply.tsx, digest.tsx)

# Команда 6. SMS-интеграция
# Если ещё нет src/lib/sms/ — подключить SMS-провайдера
# (Sms.ru / SMSC / SmsAero) с fallback-цепочкой

# Команда 7. Миграция ролей существующих пользователей
# Скрипт scripts/backfill-guest-scope.ts — добавить пустой
# guestScope всем существующим GUEST-членствам

# Команда 8. Тесты
npm run test -- --testPathPattern=guest
# E2E: приглашение → принятие → вход в кабинет → подпись акта
```

**ACCEPTANCE CRITERIA Фазы 2:**

- [ ] OWNER может пригласить гостя по email или телефону
- [ ] Приглашение доходит: email открывает страницу, SMS содержит короткую ссылку
- [ ] Гость после принятия видит только свои проекты
- [ ] Попытка GUEST открыть /app/... → редирект на /guest
- [ ] Попытка GUEST запросить /api/projects/[id] вне своего scope → 403
- [ ] Гость может оставлять комментарии, но не редактировать данные
- [ ] SMS-подпись акта работает: код приходит, подтверждение засчитывается
- [ ] В документе после подписи отображается подписант + timestamp + audit trail
- [ ] Уведомления приходят по настроенным каналам
- [ ] Отзыв гостевого доступа (OWNER может) — немедленно закрывает сессию

---

# ФАЗА 3 — «Мой Ремонт» — B2C-позиционирование (6 недель)

## 3.0. Контекст

**Что это:** Отдельная точка входа для частного заказчика (физлицо на ремонте квартиры/ИЖС), позиционируется как самостоятельный продукт, но построено на том же Komplid.

**URL-структура:**
- `komplid.ru/dlya-zakazchika` — лендинг на маркетинг-сайте (отдельный репо, см. `MODULE_MARKETING_PLAN.md`)
- `app.komplid.ru/moy-remont` — онбординг B2C-заказчика в основном приложении
- После регистрации — тот же `/guest`-layout из Фазы 2, но с расширенными функциями

**Что добавляем:**
- Новая роль в системе подписок: `CUSTOMER` (четвёртый Профи-пакет — «Заказчик Pro»)
- B2C-онбординг: заказчик сам заводит объект, приглашает подрядчика (обратная виральность!)
- Чек-листы приёмки скрытых работ (как проверить стяжку, гидроизоляцию, электрику)
- Шаблоны претензий подрядчику
- AI-юрист (вопросы через YandexGPT)
- Трекер оплат и материалов (если подрядчик не ведёт)

**Экономика:**
- Free forever: базовый кабинет (1 объект, просмотр приглашённого подрядчика)
- Pro «Заказчик» — 1 900 ₽/мес: чек-листы, AI-юрист, шаблоны претензий, неограниченные объекты
- Виральность: заказчик приглашает подрядчика → подрядчик видит как удобно → покупает Прораб-Журнал (1 900 ₽/мес)

---

## 3.1. Изменения в Prisma-схеме

```
📋 ЗАДАЧА: Модели для B2C-сценария "Мой Ремонт"

📁 ФАЙЛ: prisma/schema.prisma

ШАГ 1. Расширить UserRole / WorkspaceRole:

enum WorkspaceRole {
  OWNER
  ADMIN
  MANAGER
  WORKER
  GUEST
  CUSTOMER   // НОВЫЙ — для B2C-сценария
}

ШАГ 2. Расширить SubscriptionPlan (из MODULE15):

// Новый план: "customer_pro"
// featureCodes включают: CHECKLIST_HIDDEN_WORKS, AI_LAWYER,
// CLAIM_TEMPLATES, PAYMENT_TRACKER, UNLIMITED_CUSTOMER_PROJECTS

ШАГ 3. Модель CustomerProject для B2C-объектов:

model CustomerProject {
  id                String   @id @default(cuid())
  workspaceId       String
  workspace         Workspace @relation(fields: [workspaceId], references: [id])
  ownerUserId       String
  owner             User     @relation(fields: [ownerUserId], references: [id])
  title             String   // "Ремонт квартиры на Ленина 10"
  projectType       CustomerProjectType
  address           String
  area              Float?
  startDate         DateTime
  plannedBudget     Float?
  actualBudget      Float?
  plannedEndDate    DateTime?
  status            CustomerProjectStatus @default(PLANNING)
  contractorInvited Boolean  @default(false)
  invitedContractorId String?
  coverPhotoUrl     String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  checklists        HiddenWorksChecklist[]
  payments          CustomerPayment[]
  materials         CustomerMaterial[]
  claims            CustomerClaim[]

  @@index([ownerUserId])
}

enum CustomerProjectType {
  APARTMENT_RENOVATION
  HOUSE_CONSTRUCTION
  COTTAGE_RENOVATION
  BATHROOM_RENOVATION
  KITCHEN_RENOVATION
  FACADE_WORK
  OTHER
}

enum CustomerProjectStatus {
  PLANNING
  CONTRACTOR_SEARCH
  IN_PROGRESS
  ACCEPTANCE
  COMPLETED
  DISPUTED
}

ШАГ 4. Модель HiddenWorksChecklist (Pro-фича):

model HiddenWorksChecklist {
  id                String   @id @default(cuid())
  customerProjectId String
  customerProject   CustomerProject @relation(fields: [customerProjectId], references: [id], onDelete: Cascade)
  workType          HiddenWorkType
  status            ChecklistStatus @default(NOT_STARTED)
  items             ChecklistItem[]
  scheduledDate     DateTime?
  completedAt       DateTime?
  notes             String?
  photosBeforeIds   String[]
  photosAfterIds    String[]
  createdAt         DateTime @default(now())

  @@index([customerProjectId])
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
  id          String   @id @default(cuid())
  checklistId String
  checklist   HiddenWorksChecklist @relation(fields: [checklistId], references: [id], onDelete: Cascade)
  question    String
  hint        String?
  passed      Boolean?
  comment     String?
  order       Int
}

ШАГ 5. Модели для трекеров оплат и материалов:

model CustomerPayment {
  id                String   @id @default(cuid())
  customerProjectId String
  customerProject   CustomerProject @relation(fields: [customerProjectId], references: [id], onDelete: Cascade)
  paidAt            DateTime
  amount            Float
  purpose           String   // "Материал: плитка"
  category          PaymentCategory
  recipient         String?  // "ИП Иванов"
  receiptPhotoUrl   String?
  paymentMethod     String?
  createdAt         DateTime @default(now())

  @@index([customerProjectId])
}

enum PaymentCategory {
  MATERIALS
  WORK
  DESIGN
  EQUIPMENT
  DELIVERY
  OTHER
}

model CustomerMaterial {
  id                String   @id @default(cuid())
  customerProjectId String
  customerProject   CustomerProject @relation(fields: [customerProjectId], references: [id], onDelete: Cascade)
  title             String
  quantity          Float
  unit              String
  pricePerUnit      Float?
  totalPrice        Float?
  supplier          String?
  deliveredAt       DateTime?
  usedAt            DateTime?
  photoUrl          String?
  warrantyUntil     DateTime?
  createdAt         DateTime @default(now())
}

ШАГ 6. Модель CustomerClaim (шаблоны претензий):

model CustomerClaim {
  id                String   @id @default(cuid())
  customerProjectId String
  customerProject   CustomerProject @relation(fields: [customerProjectId], references: [id], onDelete: Cascade)
  title             String
  status            ClaimStatus @default(DRAFT)
  claimType         ClaimType
  content           String   // Markdown-текст претензии
  evidencePhotoIds  String[]
  evidenceDocIds    String[]
  generatedFromTemplate Boolean @default(false)
  sentAt            DateTime?
  sentTo            String?
  response          String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
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

КОМАНДА МИГРАЦИИ:
npx prisma migrate dev --name customer_b2c
npx prisma generate
```

---

## 3.2. API-эндпоинты Фазы 3

```
📋 ЗАДАЧА: API для B2C-заказчика

📁 ФАЙЛЫ:
- src/app/api/customer/projects/route.ts (GET list, POST create)
- src/app/api/customer/projects/[id]/route.ts (GET, PATCH, DELETE)
- src/app/api/customer/projects/[id]/invite-contractor/route.ts (POST)
- src/app/api/customer/projects/[id]/checklists/route.ts (GET, POST)
- src/app/api/customer/projects/[id]/payments/route.ts (GET, POST)
- src/app/api/customer/projects/[id]/materials/route.ts (GET, POST)
- src/app/api/customer/projects/[id]/claims/route.ts (GET, POST)
- src/app/api/customer/ai-lawyer/route.ts (POST — обёртка над YandexGPT)
- src/app/api/customer/claim-templates/route.ts (GET — каталог шаблонов)

СПЕЦИФИКАЦИЯ КЛЮЧЕВЫХ:

1) POST /api/customer/projects/[id]/invite-contractor
   Body: {
     contractorEmail?: string,
     contractorPhone?: string,
     contractorInn?: string,  // поиск зарегистрированного подрядчика
     message?: string
   }
   Логика:
   - Если по ИНН найден подрядчик в базе → отправляем ему приглашение
     на объект заказчика (ссылка в его кабинете Komplid)
   - Если не найден → отправляем invite-email со ссылкой на регистрацию
     с preset "я — подрядчик, получил приглашение на объект"
   Return: { invitationId, linkSent: boolean, contractorFound: boolean }

2) POST /api/customer/ai-lawyer
   Body: {
     question: string,
     projectContext?: { id: string, attachDocs?: string[] }
   }
   Логика:
   - Проверяем что у юзера Pro-подписка (PaywallCheck из MODULE15)
   - Собираем контекст: если projectContext.attachDocs есть —
     подгружаем текст документов
   - Отправляем в YandexGPT с system-промтом "ты юрист по строительным
     подрядам в РФ"
   - Возвращаем ответ + дисклеймер "это не юридическая консультация"
   Rate limit: 20 вопросов/день на Pro
   Return: { answer: string, references: [...], disclaimer: string }

3) POST /api/customer/projects/[id]/claims
   Body: {
     claimType: ClaimType,
     useTemplate: boolean,
     templateVars?: Record<string, string>,
     evidencePhotoIds: string[]
   }
   Логика:
   - Если useTemplate — рендерим шаблон из src/content/claim-templates/
   - Если нет — создаём пустой draft
   - Прикрепляем доказательства
   Return: { claim: CustomerClaim }

4) GET /api/customer/claim-templates
   Return: [
     { id, type, title, description, variables: [...] }
   ]
   Шаблоны: "претензия по срыву сроков", "по качеству работ",
           "по завышению сметы", "по отсутствию ИД",
           "по гарантийным обязательствам"
```

---

## 3.3. UI «Мой Ремонт»

```
📋 ЗАДАЧА: Отдельный UI-слой для B2C-заказчика

📁 ФАЙЛЫ:
- src/app/(customer)/layout.tsx — отдельный layout, легче/светлее
- src/app/(customer)/moy-remont/page.tsx — дашборд
- src/app/(customer)/moy-remont/new/page.tsx — мастер создания объекта
- src/app/(customer)/moy-remont/projects/[id]/page.tsx
- src/app/(customer)/moy-remont/projects/[id]/checklists/page.tsx
- src/app/(customer)/moy-remont/projects/[id]/payments/page.tsx
- src/app/(customer)/moy-remont/projects/[id]/materials/page.tsx
- src/app/(customer)/moy-remont/projects/[id]/claims/page.tsx
- src/app/(customer)/moy-remont/ai-lawyer/page.tsx
- src/app/(customer)/moy-remont/upgrade/page.tsx (paywall)

МАСТЕР СОЗДАНИЯ ОБЪЕКТА (/moy-remont/new):

Step 1: Какой у вас объект?
  ◉ Квартира — ремонт
  ○ Дом — строю с нуля
  ○ Дом — ремонтирую существующий
  ○ Ванная / Кухня / Комната
  ○ Другое

Step 2: Расскажите о проекте
  — Название: "Ремонт на Ленина 10"
  — Адрес (с подсказками через Яндекс.Геокодер)
  — Площадь (м²)
  — Когда планируете начать?
  — Планируемый бюджет (опционально)

Step 3: У вас уже есть подрядчик?
  ◉ Да, хочу пригласить его → поля email/телефон/ИНН
  ○ Ищу подрядчика — покажите тех, кто работает в моём районе
    (ведёт на MarketPlace — KF-4, если реализован)
  ○ Буду вести сам

Step 4: Готово! Что делать дальше?
  — Приглашение отправлено (если применимо)
  — Кнопки: "Включить чек-листы приёмки (Pro)",
           "Занести первую оплату", "Добавить материалы"

ДАШБОРД (/moy-remont):

<CustomerDashboard>
  <WelcomeHero>
    "Привет, {name}! Как идёт ваш ремонт?"
  </WelcomeHero>

  <ProjectsGrid>
    — Карточки объектов (для Free — максимум 1)
    — Kmax для Pro — неограниченно
  </ProjectsGrid>

  <QuickActions>
    — "Занести оплату"
    — "Проверить скрытые работы (Pro)"
    — "Задать вопрос AI-юристу (Pro)"
    — "Составить претензию (Pro)"
  </QuickActions>

  <PaywallPromo if="free user">
    — "Откройте все возможности Pro за 1 900 ₽/мес"
  </PaywallPromo>

  <ContractorSearchPromo if="no contractor invited">
    — "Ищете подрядчика? Посмотрите рейтинги в нашем каталоге"
    (ведёт на KF-4 если есть, иначе — на каталог завершённых объектов)
  </ContractorSearchPromo>
</CustomerDashboard>

ЧЕК-ЛИСТ СКРЫТЫХ РАБОТ (/moy-remont/projects/[id]/checklists):

<ChecklistWizard>
  <ChecklistTypeSelector>
    Картинки-плитки: Стяжка, Гидроизоляция, Электрика, Сантехника...
  </ChecklistTypeSelector>

  <ChecklistQuestions for="SCREED">
    1. Выставили ли маяки? (да/нет + фото)
    2. Проверили ровность правилом 2м? (да/нет)
    3. Есть ли компенсационные швы у стен? (да/нет + фото)
    4. Армирующая сетка на минимум 2 см от низа? (да/нет + фото)
    ... и ещё 10 вопросов
  </ChecklistQuestions>

  <ChecklistResult>
    — Если все "да" — PASSED, создаётся отчёт PDF
    — Если есть "нет" — ISSUES_FOUND, CTA "Составить претензию"
  </ChecklistResult>
</ChecklistWizard>

AI-ЮРИСТ (/moy-remont/ai-lawyer):

<AiLawyerChat>
  <ChatHistory />
  <ChatInput
    placeholder="Напишите вопрос о вашем ремонте или подряде..."
    maxLength={2000}
  />
  <SuggestedQuestions>
    — "Как правильно принять скрытые работы?"
    — "Что делать если подрядчик просит предоплату больше 30%?"
    — "Как оформить претензию по срокам?"
  </SuggestedQuestions>
  <UsageLimit>
    "Осталось вопросов сегодня: 15 из 20"
  </UsageLimit>
</AiLawyerChat>

КОМПОНЕНТЫ:
- src/components/customer/ProjectCreationWizard.tsx
- src/components/customer/CustomerDashboard.tsx
- src/components/customer/ChecklistWizard.tsx
- src/components/customer/AiLawyerChat.tsx
- src/components/customer/PaymentLedger.tsx
- src/components/customer/MaterialTracker.tsx
- src/components/customer/ClaimComposer.tsx
- src/components/customer/ContractorInviteForm.tsx
```

---

## 3.4. Контент: чек-листы и шаблоны претензий

```
📋 ЗАДАЧА: Наполнить базу данными для B2C

📁 ФАЙЛЫ:
- src/content/customer-checklists/ — JSON/MDX файлы
- src/content/claim-templates/ — шаблоны претензий
- prisma/seed/customer-checklists.ts — seed
- prisma/seed/claim-templates.ts — seed

СОЗДАТЬ ЧЕК-ЛИСТЫ (для каждого HiddenWorkType):

1) SCREED (стяжка) — 12-15 пунктов
2) WATERPROOFING (гидроизоляция) — 10-12 пунктов
3) ELECTRICAL_IN_WALLS (электрика в стенах) — 15 пунктов
4) PLUMBING_IN_WALLS (сантехника в стенах) — 12 пунктов
5) THERMAL_INSULATION — 10 пунктов
6) VENTILATION — 10 пунктов
7) ROOF_LAYERS — 12 пунктов
8) FOUNDATION — 15 пунктов

Каждый пункт: вопрос, подсказка (что смотреть), "где искать ссылку
на ГОСТ/СП".

ФОРМАТ JSON:
{
  "workType": "SCREED",
  "title": "Приёмка стяжки пола",
  "description": "...",
  "estimatedDuration": 30,  // мин
  "items": [
    {
      "question": "Выставлены ли маяки перед заливкой?",
      "hint": "Стальные или пластиковые маяки должны быть выровнены в одну плоскость",
      "standard": "СП 71.13330.2017 п.7.4.2"
    }
  ]
}

СОЗДАТЬ ШАБЛОНЫ ПРЕТЕНЗИЙ (5-7 шт):

1) "Претензия по срыву сроков"
2) "Претензия по качеству работ"
3) "Претензия по завышению сметы"
4) "Претензия по отсутствию ИД"
5) "Претензия по гарантийным обязательствам"
6) "Досудебная претензия"
7) "Отказ от договора"

Каждый шаблон: markdown с Mustache-переменными {{contractorName}},
{{projectName}}, {{issueDescription}} и т.п.

SEED-СКРИПТ:
npm run seed:customer
```

---

## 3.5. Тарифы и paywall

```
📋 ЗАДАЧА: Добавить план "Заказчик Pro" в систему подписок

📁 ФАЙЛЫ:
- prisma/seed/subscription-plans.ts (обновить)
- src/lib/subscription/features.ts (добавить feature-коды)
- src/components/customer/PaywallGate.tsx

ДОБАВИТЬ В SubscriptionPlan:

{
  id: "customer_pro",
  name: "Заказчик Pro",
  priceMonthly: 1900,
  priceYearly: 19000,
  currency: "RUB",
  audience: "B2C_CUSTOMER",
  featureCodes: [
    "CUSTOMER_HIDDEN_WORKS_CHECKLISTS",
    "CUSTOMER_AI_LAWYER",
    "CUSTOMER_CLAIM_TEMPLATES",
    "CUSTOMER_PAYMENT_TRACKER",
    "CUSTOMER_MATERIALS_TRACKER",
    "CUSTOMER_UNLIMITED_PROJECTS",
    "CUSTOMER_PRIORITY_SUPPORT"
  ]
}

FREE план для заказчика (CUSTOMER_FREE):
featureCodes: [
  "CUSTOMER_SINGLE_PROJECT",
  "CUSTOMER_BASIC_DASHBOARD",
  "CUSTOMER_INVITE_ONE_CONTRACTOR"
]

КОМПОНЕНТ PaywallGate:
- Обёртка над страницами/фичами, которые требуют Pro
- При отсутствии подписки — показывает оверлей с CTA "Попробовать Pro 7 дней бесплатно"
- При наличии — рендерит дочерний контент
- Переиспользует логику из MODULE15 (FeatureCheck helper)
```

---

## 3.6. Команды для Claude Code — Фаза 3

```bash
# Команда 1. Миграция
npx prisma migrate dev --name customer_b2c
npx prisma generate

# Команда 2. Seed
# Создать seed-скрипты для чек-листов и шаблонов
npm run seed:customer

# Команда 3. API-эндпоинты (9 файлов по спеке 3.2)

# Команда 4. UI
# Создать route group (customer) + layout + 10 страниц
# + 8 компонентов из 3.3

# Команда 5. YandexGPT интеграция
# Если ещё нет src/lib/ai/yandex-gpt.ts — создать клиент
# Пример API-вызова:
# POST https://llm.api.cloud.yandex.net/foundationModels/v1/completion
# с Authorization: Api-Key <YANDEX_AI_KEY>

# Команда 6. Подписки
# Обновить список SubscriptionPlan (MODULE15)
# Добавить feature-коды
# Настроить paywall-компонент

# Команда 7. Маркетинг-лендинг
# В komplid-marketing репо создать /dlya-zakazchika
# (см. MODULE_MARKETING_PLAN.md раздел 2)
# Ссылки с лендинга → app.komplid.ru/moy-remont/new

# Команда 8. Тесты
# E2E: заказчик регистрируется → создаёт объект → приглашает подрядчика
# → подрядчик принимает → заказчик видит обновления
# E2E Pro: подключает Pro → проходит чек-лист → задаёт вопрос AI
```

**ACCEPTANCE CRITERIA Фазы 3:**

- [ ] Заказчик-физлицо может зарегистрироваться и создать объект без приглашения
- [ ] Мастер создания объекта работает за < 3 минут
- [ ] Free-тариф ограничивает 1 объектом, Pro — неограниченно
- [ ] Приглашение подрядчика по ИНН работает (если подрядчик есть в базе)
- [ ] Если нет — подрядчик получает email-приглашение с регистрацией
- [ ] Чек-листы приёмки работают: генерируется PDF-отчёт
- [ ] AI-юрист отвечает осмысленно, лимит 20 вопросов/день на Pro
- [ ] Трекер оплат работает, можно прикрепить чек
- [ ] Шаблоны претензий подставляют переменные корректно
- [ ] Paywall показывается при попытке использовать Pro-фичу на Free
- [ ] Конверсия с лендинга /dlya-zakazchika в регистрацию > 5%

---

# ЧАСТЬ II — KILLER-ФИЧИ

# KF-1 — AI-проверка комплектности ИД перед сдачей (2 недели)

## KF-1.0. Контекст

**Проблема:** ПТО-инженер за день до сдачи обнаруживает, что в пакете не хватает АОСР на электромонтаж. Переделка, бессонная ночь, штрафы.

**Решение:** Кнопка "Проверь пакет перед сдачей" в проекте. AI анализирует всю связку документов (АОСР, ОЖР, КС-2) против нормативных требований и возвращает список пропусков.

**Зависимости:**
- Существующие модели `Document`, `AOSR`, `WorkJournalEntry`, `ActKS2`
- YandexGPT (интеграция добавляется здесь, если её ещё нет)

---

## KF-1.1. Изменения в Prisma-схеме

```
📋 ЗАДАЧА: Модели для AI-проверки

📁 ФАЙЛ: prisma/schema.prisma

model AiComplianceCheck {
  id            String   @id @default(cuid())
  projectId     String
  project       Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  initiatedBy   String
  initiator     User     @relation(fields: [initiatedBy], references: [id])
  scope         AiCheckScope
  scopeFilter   Json?    // { stageIds: [], dateRange: {} }
  status        AiCheckStatus @default(QUEUED)
  summary       String?
  issueCount    Int      @default(0)
  issues        AiComplianceIssue[]
  checkedDocs   Int      @default(0)
  tokensUsed    Int      @default(0)
  cost          Float    @default(0)
  startedAt     DateTime?
  finishedAt    DateTime?
  createdAt     DateTime @default(now())

  @@index([projectId, status])
}

enum AiCheckScope {
  FULL_PROJECT
  STAGE
  DATE_RANGE
  PRE_DELIVERY  // перед сдачей этапа/объекта
}

enum AiCheckStatus {
  QUEUED
  RUNNING
  COMPLETED
  FAILED
}

model AiComplianceIssue {
  id            String   @id @default(cuid())
  checkId       String
  check         AiComplianceCheck @relation(fields: [checkId], references: [id], onDelete: Cascade)
  severity      IssueSeverity
  category      IssueCategory
  title         String
  description   String
  affectedDocs  String[]
  suggestedFix  String?
  standard      String?  // ссылка на норматив: "СП 48.13330 п.5.4"
  autoFixable   Boolean  @default(false)
  resolvedAt    DateTime?
  createdAt     DateTime @default(now())

  @@index([checkId, severity])
}

enum IssueSeverity {
  CRITICAL   // блокер сдачи
  HIGH       // серьёзное замечание
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
}

КОМАНДА:
npx prisma migrate dev --name ai_compliance_check
```

---

## KF-1.2. API и AI-логика

```
📋 ЗАДАЧА: AI-проверка через YandexGPT

📁 ФАЙЛЫ:
- src/app/api/projects/[id]/compliance-check/route.ts (POST, GET)
- src/app/api/projects/[id]/compliance-check/[checkId]/route.ts (GET)
- src/app/api/projects/[id]/compliance-check/[checkId]/issues/[issueId]/resolve/route.ts (POST)
- src/lib/ai/compliance/engine.ts — ядро логики
- src/lib/ai/compliance/rules.ts — правила проверки
- src/lib/ai/compliance/prompts.ts — промты для YandexGPT
- src/lib/queue/ai-compliance-worker.ts — фоновый воркер

ЛОГИКА engine.ts:

async function runComplianceCheck(checkId: string) {
  const check = await prisma.aiComplianceCheck.findUnique({...});
  await prisma.aiComplianceCheck.update({
    where: { id: checkId }, data: { status: RUNNING, startedAt: now() }
  });

  // Шаг 1: Собираем корпус документов в scope
  const corpus = await gatherDocumentsForCheck(check);

  // Шаг 2: Правила, которые можно проверить без AI (детерминированно)
  const deterministicIssues = await runDeterministicRules(corpus);
  // Проверки: "Для каждой работы из ОЖР должен быть АОСР",
  //          "Подписи на АОСР должны быть валидны",
  //          "Даты КС-2 не раньше дат АОСР" и т.п.

  // Шаг 3: AI-проверка: через YandexGPT
  const aiIssues = await runAiChecks(corpus);
  // Prompt: "Вот пакет ИД по проекту <name>. Проверь на соответствие
  //         СП 48.13330 и приказу Минстроя 344/пр. Верни JSON с
  //         массивом issues: [{severity, category, title, description,
  //         affectedDocs, suggestedFix, standard}]"

  // Шаг 4: Сохраняем
  await prisma.aiComplianceIssue.createMany({
    data: [...deterministicIssues, ...aiIssues]
  });

  await prisma.aiComplianceCheck.update({
    where: { id: checkId },
    data: {
      status: COMPLETED,
      finishedAt: now(),
      issueCount: ...,
      summary: generateSummary(...)
    }
  });

  // Шаг 5: Уведомление инициатору
  await notifyUserComplianceReady(check.initiatedBy, checkId);
}

ДЕТЕРМИНИРОВАННЫЕ ПРАВИЛА (минимум 30 штук):

1. "Для каждого этапа с WorkJournalEntry должен быть хотя бы один АОСР"
2. "Все АОСР на скрытые работы должны иметь фото до/после"
3. "Подписи заказчика и технадзора на АОСР должны быть обе"
4. "Дата АОСР не должна быть позже даты КС-2, включающей эту работу"
5. "В акте не должно быть работ, которые не фигурируют в смете проекта"
6. "Для каждого материала на скрытые работы должен быть паспорт/сертификат"
... (полный список вынести в rules.ts)

AI-ПРОМТЫ (prompts.ts):

- systemPrompt: роль эксперта по ИД в РФ (опыт 20 лет ПТО)
- userPromptTemplate: шаблон, где подставляется корпус
- schemaHint: JSON-схема, которую AI должен возвращать

СПЕЦИФИКАЦИЯ API:

1) POST /api/projects/[id]/compliance-check
   Body: {
     scope: AiCheckScope,
     scopeFilter?: { stageIds?: string[], dateFrom?, dateTo? }
   }
   Логика: создаёт AiComplianceCheck(status=QUEUED), ставит в очередь
   Проверка лимитов: 5 проверок в месяц на Free, 50 на Team, unlimited Corporate
   Return: { checkId, estimatedTimeMin: 2-5 }

2) GET /api/projects/[id]/compliance-check/[checkId]
   Return: { check, issues: AiComplianceIssue[] }

3) POST .../issues/[issueId]/resolve
   Body: { resolution: "manual_fix" | "ignore" | "not_applicable", note? }
   Помечает проблему resolvedAt
```

---

## KF-1.3. UI для AI-проверки

```
📋 ЗАДАЧА: Страница отчётов AI-проверки

📁 ФАЙЛЫ:
- src/app/(app)/projects/[id]/compliance/page.tsx
- src/components/compliance/ComplianceCheckButton.tsx
- src/components/compliance/ComplianceReportView.tsx
- src/components/compliance/IssuesList.tsx

UI:

<CompliancePage>
  <RunCheckSection>
    <ScopeSelector>
      ◉ Весь проект
      ○ Конкретный этап: [выбор]
      ○ Период: [даты]
      ○ Перед сдачей (с учётом нормативов)
    </ScopeSelector>
    <RunCheckButton>
      Запустить проверку (уйдёт 2-5 минут)
    </RunCheckButton>
  </RunCheckSection>

  <PreviousChecksList>
    — Последние 10 проверок с статусами и ссылками
  </PreviousChecksList>

  <CheckResultView if="check loaded">
    <Summary>
      "Найдено 3 критических, 7 серьёзных, 12 незначительных проблем"
      Progress bar "пакет готов на 85%"
    </Summary>

    <IssuesList groupBy="severity">
      {issues.map(issue => (
        <IssueCard>
          <SeverityBadge />
          <Title />
          <Description />
          <AffectedDocs />
          <SuggestedFix />
          <Standard />  // "СП 48.13330 п.5.4"
          <Actions>
            "Перейти к документу" | "Игнорировать" | "Отметить как решённое"
          </Actions>
        </IssueCard>
      ))}
    </IssuesList>

    <ExportActions>
      "Скачать PDF отчёта" | "Отправить по email заказчику"
    </ExportActions>
  </CheckResultView>
</CompliancePage>

КНОПКА "ПРОВЕРЬ ПЕРЕД СДАЧЕЙ" в контексте:
- В блоке документов проекта — CTA
- В окне сдачи этапа — сначала предлагаем запустить проверку
```

---

## KF-1.4. Команды для Claude Code — KF-1

```bash
# Команда 1. Миграция
npx prisma migrate dev --name ai_compliance_check

# Команда 2. YandexGPT клиент
# Если ещё нет src/lib/ai/yandex-gpt.ts:
# Создать клиента с поддержкой rate limiting + retry

# Команда 3. Движок проверки
# src/lib/ai/compliance/engine.ts
# src/lib/ai/compliance/rules.ts (30+ правил)
# src/lib/ai/compliance/prompts.ts

# Команда 4. Очередь
# Если в проекте уже есть очереди (BullMQ/graphile-worker) —
# добавить job "compliance-check"
# Если нет — простейший запуск через process.nextTick с таймаутом
# или через pg-boss

# Команда 5. API
# 3 эндпоинта из KF-1.2

# Команда 6. UI
# Страница + 3 компонента
# Добавить ссылку "AI-проверка" в сайдбар проекта

# Команда 7. Интеграция в "сдачу этапа"
# При нажатии "Закрыть этап" → предлагаем AI-проверку
# Если есть CRITICAL issues — не даём закрыть без подтверждения

# Команда 8. Тесты
# Unit: каждое правило rules.ts с edge cases
# Интеграционные: создание заведомо неполного пакета → проверка
#                 находит отсутствие АОСР
```

**ACCEPTANCE CRITERIA KF-1:**

- [ ] Кнопка запуска проверки работает из разных точек (проект, сдача этапа)
- [ ] Проверка запускается в фоне, UI показывает прогресс
- [ ] Минимум 30 детерминированных правил срабатывают корректно
- [ ] AI-часть возвращает структурированный JSON (через function calling YandexGPT)
- [ ] При наличии CRITICAL issues закрытие этапа блокируется с подсказкой
- [ ] Каждая проблема имеет ссылку на конкретный документ для исправления
- [ ] Отчёт экспортируется в PDF
- [ ] Лимиты по тарифу работают (5/50/unlimited проверок в месяц)
- [ ] Токены YandexGPT считаются, видна стоимость проверки в биллинге

---

# KF-2 — Публичное портфолио подрядчика (1 неделя)

## KF-2.0. Контекст

**Цель:** Превратить завершённые публичные дашборды (из Фазы 1) в публичную SEO-страницу подрядчика. `komplid.ru/companies/<slug>` — автоматически генерируемое портфолио.

**Почему это киллер:**
- SEO-канал: каждый подрядчик тянет трафик
- Виральность: подрядчик сам заинтересован держать страницу обновлённой
- Социальное доказательство: реальные фото, реальные отзывы

**Где живёт:** Основные данные в основном приложении (`stroydocs/`), публичная рендер-страница — в маркетинг-репо (`komplid-marketing/`), которая берёт данные через внутренний API `/api/public/contractor/[slug]`.

---

## KF-2.1. Изменения в Prisma-схеме

```
📋 ЗАДАЧА: Модель профиля подрядчика и отзывов

📁 ФАЙЛ: prisma/schema.prisma

ШАГ 1. Расширить Workspace:

model Workspace {
  // ... существующие поля
  publicProfileEnabled   Boolean  @default(false)
  publicSlug             String?  @unique  // для URL: /companies/<slug>
  publicDescription      String?  // краткое описание компании
  logoUrl                String?
  headerImageUrl         String?
  foundedYear            Int?
  teamSize               String?  // "1-5", "5-20", "20-100", "100+"
  specializations        String[] // ["Жилые дома", "Общественные", "Промышленные"]
  geoRegions             String[] // ["Москва", "МО", "СПб"]
  inn                    String?  // для верификации через ФНС API
  verifiedBusinessAt     DateTime?
  website                String?
  contactPhone           String?
  contactEmail           String?
  socialLinks            Json?    // { telegram, vk, instagram }
}

ШАГ 2. Модель ContractorReview:

model ContractorReview {
  id              String   @id @default(cuid())
  workspaceId     String
  workspace       Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  projectId       String
  project         Project  @relation(fields: [projectId], references: [id])
  authorName      String   // имя заказчика
  authorRole      String?  // "Частный заказчик", "Генподрядчик", ...
  rating          Int      // 1-5
  pros            String?
  cons            String?
  content         String
  verified        Boolean  @default(false)
  status          ReviewStatus @default(PENDING_MODERATION)
  submittedAt     DateTime @default(now())
  publishedAt     DateTime?

  @@index([workspaceId, status])
}

enum ReviewStatus {
  PENDING_MODERATION
  PUBLISHED
  REJECTED
  HIDDEN
}

ШАГ 3. PortfolioItem — обёртка над проектом для портфолио:

model PortfolioItem {
  id              String   @id @default(cuid())
  workspaceId     String
  workspace       Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  projectId       String   @unique
  project         Project  @relation(fields: [projectId], references: [id])
  title           String   // может отличаться от project.name (для SEO)
  excerpt         String?
  coverPhotoId    String?
  showInPortfolio Boolean  @default(false)
  order           Int      @default(0)
  publishedAt     DateTime?
  slug            String?  @unique

  @@index([workspaceId, showInPortfolio])
}

КОМАНДА:
npx prisma migrate dev --name contractor_portfolio
```

---

## KF-2.2. API-эндпоинты

```
📁 ФАЙЛЫ:
- src/app/api/workspaces/[id]/profile/route.ts (GET, PATCH)
- src/app/api/workspaces/[id]/profile/portfolio/route.ts (GET, POST)
- src/app/api/workspaces/[id]/profile/portfolio/[itemId]/route.ts (PATCH, DELETE)
- src/app/api/public/contractors/[slug]/route.ts — ПУБЛИЧНЫЙ
- src/app/api/public/contractors/[slug]/reviews/route.ts — ПУБЛИЧНЫЙ
- src/app/api/public/contractors/search/route.ts — ПУБЛИЧНЫЙ

СПЕЦИФИКАЦИЯ ПУБЛИЧНЫХ:

GET /api/public/contractors/[slug]
Return: {
  workspace: { name, description, logoUrl, headerImageUrl, foundedYear,
               teamSize, specializations, geoRegions, verifiedBusinessAt },
  stats: {
    completedProjects: number,
    totalAreaM2: number,
    avgRating: number,
    reviewCount: number,
    yearsActive: number
  },
  portfolio: PortfolioItem[],  // только showInPortfolio=true
  recentProjects: Project[]    // завершённые за 12 мес
}

GET /api/public/contractors/search?q=&region=&specialization=&minRating=
Return: {
  items: [...], total, page, pageSize
}

Рейтинг вычисляется как среднее по reviews.rating, только verified + published.
```

---

## KF-2.3. UI управления профилем в приложении

```
📁 ФАЙЛ: src/app/(app)/workspace/public-profile/page.tsx

UI:

<PublicProfileEditor>
  <EnableToggle>
    "Публичный профиль компании"
  </EnableToggle>

  <SlugEditor>
    — URL: komplid.ru/companies/<slug>
    — Валидация: a-z, 0-9, -
    — Проверка уникальности
  </SlugEditor>

  <CompanyInfoForm>
    — Логотип (upload)
    — Header-изображение
    — Название компании (отличается от workspace.name)
    — Описание (ограничение 500 симв)
    — Год основания
    — Размер команды (dropdown)
    — Специализации (multi-select из преднабора)
    — География работ (Яндекс.Геокодер)
    — ИНН (с кнопкой "Проверить в ФНС")
    — Контакты: сайт, телефон, email
    — Соцсети
  </CompanyInfoForm>

  <PortfolioManager>
    — Список завершённых проектов с галочкой "Показать в портфолио"
    — Для каждого: custom title, excerpt, cover photo
    — Drag-and-drop для порядка
  </PortfolioManager>

  <ReviewsManager>
    — Список полученных отзывов с модерацией
    — Можно скрыть отзыв, но нельзя удалить (антипаттерн)
    — Кнопка "Попросить отзыв" — отправляет форму заказчику
  </ReviewsManager>

  <AnalyticsPreview>
    — Количество просмотров профиля за 7/30 дней
    — Источники трафика
    — Конверсия в заявки
  </AnalyticsPreview>
</PublicProfileEditor>
```

---

## KF-2.4. Публичная страница (в маркетинг-репо)

```
📋 ЗАДАЧА: Создать публичный рендер в komplid-marketing

📁 ФАЙЛЫ (в репо komplid-marketing):
- src/app/companies/page.tsx — каталог
- src/app/companies/[slug]/page.tsx — профиль подрядчика
- src/components/contractor/ContractorHero.tsx
- src/components/contractor/PortfolioGrid.tsx
- src/components/contractor/ReviewsSection.tsx
- src/components/contractor/ContactCta.tsx

ДАННЫЕ:
Страница делает fetch на app.komplid.ru/api/public/contractors/[slug]
Использует ISR с revalidate=3600

SEO-МЕТА:

<head>
  <title>ООО "Стройка+" — строительный подрядчик в Москве | Komplid</title>
  <meta description="X завершённых проектов, рейтинг Y, специализация Z. Фото, отзывы, контакты.">
  <link rel="canonical" href="https://komplid.ru/companies/stroyka-plus">

  Schema.org:
  {
    "@type": "LocalBusiness",
    "name": "...",
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": 4.7, "reviewCount": 23 },
    "review": [...],
    "areaServed": [...]
  }
</head>

ВИДЫ В UI:

<ContractorPage>
  <Hero>
    — Header image + логотип
    — Название, специализация, регион
    — Бейдж "Верифицирован" если verifiedBusinessAt
    — Кнопка "Связаться" (откр. форму)
  </Hero>

  <Stats>
    "X завершённых" | "Y м²" | "Z лет" | "Рейтинг: A/5"
  </Stats>

  <Portfolio>
    — Грид карточек: фото + название + короткое описание
    — По клику — на /companies/[slug]/projects/[itemSlug]
    — Или на /shared/project/[token] если есть публичный дашборд
  </Portfolio>

  <Reviews>
    — Список verified отзывов
    — Сортировка: свежие/рейтинг
  </Reviews>

  <ContactForm>
    — Имя / телефон / описание задачи
    — Отправляется на app.komplid.ru/api/public/lead с source=contractor_portfolio
    — Попадает в CRM-лиды подрядчика (если у него есть Team-тариф)
  </ContactForm>

  <PromoBlock>
    "Хотите такой же публичный профиль?
    Зарегистрируйтесь в Komplid → app.komplid.ru/signup"
  </PromoBlock>
</ContractorPage>

КАТАЛОГ /companies:
— Фильтры: регион, специализация, минимальный рейтинг
— Поиск по названию
— Пагинация
— Schema.org ItemList
```

---

## KF-2.5. Команды для Claude Code — KF-2

```bash
# В репо stroydocs/:
npx prisma migrate dev --name contractor_portfolio
# Создать 6 API-эндпоинтов из KF-2.2
# Создать страницу workspace/public-profile + компоненты
# Добавить в сайдбар "Публичный профиль"
# Форму запроса отзыва (после завершения проекта)

# В репо komplid-marketing/:
# Создать /companies и /companies/[slug]
# Настроить ISR + fetch с app.komplid.ru
# Schema.org LocalBusiness
# Sitemap: добавить подрядчиков в /sitemap.xml
# robots.txt: allow /companies/

# Верификация по ИНН:
# src/lib/verification/fns.ts — парсер API dadata.ru или checko.ru
# (платный API, но ~3-5 руб за проверку)

# Запрос отзыва:
# После перехода проекта в COMPLETED → email клиенту с формой
# Форма публичная (без auth), токенизирована по projectId
```

**ACCEPTANCE CRITERIA KF-2:**

- [ ] Подрядчик может настроить публичный профиль за < 10 минут
- [ ] Проверка ИНН через ФНС работает, бейдж "Верифицирован" появляется
- [ ] Страница /companies/[slug] открывается и индексируется Яндексом
- [ ] Schema.org валиден (Rich Results Test)
- [ ] Портфолио показывает только завершённые проекты с showInPortfolio=true
- [ ] Отзывы можно получить через автоматический запрос после завершения
- [ ] Каталог /companies имеет фильтры, работает пагинация
- [ ] Lighthouse > 90 на всех страницах каталога

---

# KF-3 — OCR сканов актов через Yandex Vision (3 недели)

## KF-3.0. Контекст

**Проблема:** Сметчик/ПТО получает бумажные акты со стройки (фото/скан). Перепечатывает вручную. Тратит 20-40 минут на акт.

**Решение:** Фото/PDF → Yandex Vision OCR → распознавание полей → предзаполненный акт в системе. Ручная корректировка — и акт в ИД.

---

## KF-3.1. Изменения в Prisma-схеме

```
📁 ФАЙЛ: prisma/schema.prisma

model OcrJob {
  id            String   @id @default(cuid())
  workspaceId   String
  workspace     Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  initiatedBy   String
  initiator     User     @relation(fields: [initiatedBy], references: [id])
  sourceFileUrl String
  sourceMimeType String
  targetType    OcrTargetType  // AOSR, KS2, KS3, JOURNAL, GENERIC
  status        OcrStatus @default(QUEUED)
  rawText       String?
  extractedJson Json?
  confidence    Float?
  errorMessage  String?
  createdAt     DateTime @default(now())
  completedAt   DateTime?
  linkedDocumentId String?

  @@index([workspaceId, status])
}

enum OcrTargetType {
  AOSR
  KS2
  KS3
  WORK_JOURNAL
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
npx prisma migrate dev --name ocr_job
```

---

## KF-3.2. API и логика OCR

```
📁 ФАЙЛЫ:
- src/app/api/ocr/jobs/route.ts (POST — создать, GET — список)
- src/app/api/ocr/jobs/[id]/route.ts (GET, DELETE)
- src/app/api/ocr/jobs/[id]/apply/route.ts (POST — создать документ из результата)
- src/lib/ocr/yandex-vision.ts — клиент
- src/lib/ocr/parsers/aosr.ts
- src/lib/ocr/parsers/ks2.ts
- src/lib/ocr/parsers/work-journal.ts
- src/lib/queue/ocr-worker.ts

YANDEX VISION API:
POST https://vision.api.cloud.yandex.net/vision/v1/batchAnalyze
Body: {
  "folderId": "<folder-id>",
  "analyze_specs": [{
    "content": "<base64>",
    "features": [{ "type": "TEXT_DETECTION", "text_detection_config": { "language_codes": ["ru", "en"] }}]
  }]
}

ПРОЦЕСС:

async function processOcrJob(jobId: string) {
  const job = await prisma.ocrJob.findUnique({...});

  // 1. Скачиваем файл из нашего storage
  await prisma.ocrJob.update({ where: { id }, data: { status: DOWNLOADING }});
  const file = await storage.download(job.sourceFileUrl);

  // 2. Если PDF — разбиваем на страницы (pdf-lib)
  const pages = job.sourceMimeType === 'application/pdf'
    ? await splitPdfToImages(file)
    : [file];

  // 3. Отправляем в Yandex Vision
  await prisma.ocrJob.update({ where: { id }, data: { status: OCR_IN_PROGRESS }});
  const rawResults = await Promise.all(
    pages.map(page => yandexVision.analyze(page))
  );
  const rawText = rawResults.map(r => extractText(r)).join('\n\n--- PAGE ---\n\n');

  // 4. Парсим в зависимости от target-type
  await prisma.ocrJob.update({ where: { id }, data: { status: PARSING, rawText }});

  let extracted;
  switch (job.targetType) {
    case 'AOSR': extracted = await parseAOSR(rawText); break;
    case 'KS2': extracted = await parseKS2(rawText); break;
    // ...
  }

  // Для сложных случаев — добавляем YandexGPT для структурирования:
  // "Вот OCR-текст акта скрытых работ. Извлеки поля: [список]. Верни JSON"

  // 5. Оцениваем уверенность
  const confidence = calculateConfidence(extracted, rawResults);

  const nextStatus = confidence < 0.85 ? NEEDS_REVIEW : COMPLETED;

  await prisma.ocrJob.update({
    where: { id },
    data: {
      status: nextStatus,
      extractedJson: extracted,
      confidence,
      completedAt: now()
    }
  });

  // 6. Уведомление
  await notifyUser(job.initiatedBy, jobId, nextStatus);
}

СПЕЦИФИКАЦИЯ API:

1) POST /api/ocr/jobs
   Body (multipart/form-data):
     - file: File (JPG/PNG/PDF, до 20 MB)
     - targetType: OcrTargetType
     - projectId?: string
   Проверка лимита по тарифу:
     - Free: 5 OCR в месяц
     - Team: 100
     - Corporate: unlimited
   Return: { jobId, estimatedTimeMin: 1-3 }

2) GET /api/ocr/jobs/[id]
   Return: { job, extractedJson, confidence, linkedDocumentId? }

3) POST /api/ocr/jobs/[id]/apply
   Body: { correctedJson: Json, createDocument: boolean, projectId, stageId? }
   Логика: создаёт настоящий Document/AOSR/ActKS2 на основе исправленного JSON
           связывает OcrJob.linkedDocumentId
   Return: { document }
```

---

## KF-3.3. Парсеры и извлечение полей

```
📁 ФАЙЛЫ src/lib/ocr/parsers/*.ts

ПАРСЕР AOSR (aosr.ts):

Извлекаемые поля:
- Номер акта
- Дата
- Объект (название + адрес)
- Заказчик
- Генподрядчик
- Субподрядчик (если есть)
- Вид скрытых работ
- Дата начала работ
- Дата окончания работ
- Список материалов (таблица): наименование, документ качества, марка/ГОСТ
- Список работ (таблица): наименование, объём, ед. изм
- Ссылка на проектную документацию (чертёж)
- Ссылка на СП/ГОСТ
- ФИО представителей + подписи (факт наличия)

Алгоритм:
1. Regex на типовые паттерны ("от «___» _________ 20__г.",
   "АКТ № _______", "Генеральный подрядчик:")
2. Табличные данные — через поиск структур "| X | Y | Z |"
   или через Yandex Vision TABLE_DETECTION (если доступно)
3. Fallback через YandexGPT:
   prompt: "Извлеки из текста акта скрытых работ поля X, Y, Z в JSON"

ПАРСЕР KS2 (ks2.ts):
Извлекаемые поля:
- Номер, дата
- Объект, заказчик, подрядчик
- Отчётный период
- Таблица работ: наименование, ед.изм, количество, цена, стоимость
- Итоговые суммы (всего, НДС, к оплате)
- ФИО подписантов

ПАРСЕР WORK_JOURNAL (work-journal.ts):
Записи в общем журнале работ (ОЖР):
- Дата
- Описание работ
- Подписи
- Связь с АОСР/КС-2 (если есть ссылки)
```

---

## KF-3.4. UI OCR-мастера

```
📁 ФАЙЛЫ:
- src/app/(app)/ocr/page.tsx — список всех OCR-заданий
- src/app/(app)/ocr/new/page.tsx — мастер
- src/app/(app)/ocr/[id]/review/page.tsx — просмотр и правка результатов
- src/components/ocr/UploadDropzone.tsx
- src/components/ocr/TargetTypeSelector.tsx
- src/components/ocr/ExtractedFieldsEditor.tsx
- src/components/ocr/SideBySidePreview.tsx (оригинал + распознанное)

МАСТЕР (/ocr/new):

Step 1: Загрузите документ
  — Dropzone: JPG/PNG/PDF
  — Предпросмотр
  — Подсказка: "Лучшие результаты при 300 DPI и выше"

Step 2: Что это за документ?
  — Плитки: "АОСР", "КС-2", "КС-3", "ОЖР", "Паспорт материала", "Чек", "Другое"

Step 3: К какому проекту?
  — Выбор проекта из списка (если есть projectId по умолчанию — ставим его)

Step 4: Запуск
  — Прогресс-бар (SSE или polling каждые 3 сек)
  — По завершении — редирект на review

REVIEW (/ocr/[id]/review):

<SideBySideView>
  <OriginalImage />   // можно пролистывать страницы
  <ExtractedFields>
    — Все извлечённые поля как form-поля
    — Рядом с каждым: процент уверенности (цветовой индикатор)
    — Подсветка: если confidence < 0.8 — жёлтый фон
    — Если критичные поля пустые — красный бейдж "Требуется ручной ввод"
  </ExtractedFields>
</SideBySideView>

<ApplyActions>
  — Чекбокс "Привязать к существующему документу" (если есть похожий)
  — Или кнопка "Создать новый документ из этих данных"
  — По клику — создаётся реальный Document/AOSR/KS2
</ApplyActions>
```

---

## KF-3.5. Команды для Claude Code — KF-3

```bash
# Команда 1. Миграция
npx prisma migrate dev --name ocr_job

# Команда 2. Yandex Vision клиент
# src/lib/ocr/yandex-vision.ts
# Переменные: YANDEX_VISION_FOLDER_ID, YANDEX_AI_KEY (IAM token или API key)

# Команда 3. Парсеры (4 штуки)
# src/lib/ocr/parsers/aosr.ts, ks2.ts, work-journal.ts, receipt.ts

# Команда 4. Очередь
# OCR-воркер в src/lib/queue/ocr-worker.ts
# Использовать существующую инфраструктуру очередей (как у AI Compliance)

# Команда 5. API (3 эндпоинта)

# Команда 6. UI
# Страницы /ocr/*, компоненты
# Интеграция: в карточке документа кнопка "Распознать со скана"

# Команда 7. Обработка PDF
# npm install pdf-lib pdfjs-dist
# Для разбиения PDF на страницы перед OCR

# Команда 8. Тесты
# Тестовый набор реальных сканов (разрешить загрузить 10-20 типовых АОСР)
# Сравнение extracted vs expected
# Метрика: field-level accuracy >= 90%
```

**ACCEPTANCE CRITERIA KF-3:**

- [ ] Пользователь может загрузить фото/PDF акта
- [ ] Распознавание занимает < 3 минут для 1-страничного акта
- [ ] Точность извлечения полей: >= 90% для типовых АОСР
- [ ] UI показывает side-by-side: оригинал + поля
- [ ] Низкая уверенность подсвечивается и требует ручной проверки
- [ ] Создание документа из OCR-результата работает без потерь данных
- [ ] Лимиты по тарифу соблюдаются
- [ ] Стоимость OCR-задания отображается пользователю (~2-5 руб/страницу)

---

# KF-4 — Маркетплейс субподрядчиков (4 недели)

## KF-4.0. Контекст и предусловия

**ВАЖНО:** Запускать **только после 1000+ активных аккаунтов**. Раньше — рынок двусторонний, без ликвидности с обеих сторон марткетплейс мертвый.

**Что это:** Площадка «нужна бригада/подрядчик» ↔ «ищем заказы». Рейтинги формируются из закрытых в Komplid объектов (не от фонаря).

**Связь с существующим:**
- Рейтинг подрядчика — из KF-2 (verified reviews)
- Публичный профиль — из KF-2 (отсюда берётся карточка в выдаче)
- Контакты — из KF-2 (Workspace.contactPhone/Email)

**Юридическая модель:** Komplid — площадка объявлений и рейтингов, не ответственный за договорные отношения. Обязательный дисклеймер в оферте.

---

## KF-4.1. Изменения в Prisma-схеме

```
📁 ФАЙЛ: prisma/schema.prisma

model MarketplaceListing {
  id             String   @id @default(cuid())
  workspaceId    String
  workspace      Workspace @relation(fields: [workspaceId], references: [id])
  createdBy      String
  creator        User     @relation(fields: [createdBy], references: [id])
  type           ListingType
  title          String
  description    String
  specialization String   // код из общего справочника
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
  attachments    String[]
  publishedAt    DateTime?
  expiresAt      DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  responses      MarketplaceResponse[]

  @@index([type, status, region])
  @@index([specialization, status])
}

enum ListingType {
  CUSTOMER_REQUEST    // заказчик ищет подрядчика
  CONTRACTOR_OFFER    // подрядчик предлагает услуги
  SUBCONTRACTOR_REQUEST // ген ищет суб
  MATERIAL_SUPPLY     // поставка материалов
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
  VERIFIED_ONLY       // только верифицированным подрядчикам
  PREMIUM_ONLY        // только Team/Corporate
}

model MarketplaceResponse {
  id            String   @id @default(cuid())
  listingId     String
  listing       MarketplaceListing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  respondingWorkspaceId String
  respondingBy  String
  responder     User     @relation(fields: [respondingBy], references: [id])
  message       String
  proposedPrice Float?
  proposedDeadline DateTime?
  status        ResponseStatus @default(NEW)
  attachments   String[]
  respondedAt   DateTime @default(now())
  selectedAt    DateTime?
  rejectedAt    DateTime?
  rejectionReason String?

  @@index([listingId, status])
}

enum ResponseStatus {
  NEW
  VIEWED
  IN_DIALOG
  SELECTED
  REJECTED
}

model MarketplaceModerationLog {
  id         String   @id @default(cuid())
  listingId  String?
  responseId String?
  moderatorId String?
  action     String   // "APPROVED", "REJECTED", "BANNED"
  reason     String?
  createdAt  DateTime @default(now())
}

КОМАНДА:
npx prisma migrate dev --name marketplace_listings
```

---

## KF-4.2. API-эндпоинты маркетплейса

```
📁 ФАЙЛЫ:
- src/app/api/marketplace/listings/route.ts (GET — каталог, POST — создать)
- src/app/api/marketplace/listings/[id]/route.ts (GET, PATCH, DELETE)
- src/app/api/marketplace/listings/[id]/respond/route.ts (POST)
- src/app/api/marketplace/listings/[id]/responses/route.ts (GET — для автора)
- src/app/api/marketplace/responses/[id]/route.ts (PATCH — статус)
- src/app/api/marketplace/my-listings/route.ts (GET)
- src/app/api/marketplace/my-responses/route.ts (GET)
- src/app/api/marketplace/moderation/queue/route.ts (модератор)

ФИЛЬТРЫ /marketplace/listings:
GET ?type=&specialization=&region=&budgetMin=&budgetMax=&deadline=&sort=

Return: { items, total, facets: { specializations, regions, budgets } }

КЛЮЧЕВЫЕ ОГРАНИЧЕНИЯ:

1) Создание листинга:
   - Free (заказчик): 1 активный листинг
   - Team/Corporate: unlimited
   - Модерация: все до первого publish, потом автомодерация

2) Отклик на листинг:
   - Free подрядчик: 3 отклика/мес
   - Prorab / Smetchik / PTO Pro: 20/мес
   - Team: 100/мес
   - Corporate: unlimited

3) Антиспам:
   - Rate limit: 5 листингов/день/workspace
   - Дубликаты по content hash блокируются
   - Автоблокировка на 3 жалобы от верифицированных юзеров

4) Контакты:
   - Прямые контакты (phone/email) прячутся до установления диалога
   - Обмен через внутренний чат
   - После 3 сообщений обоих сторон — контакты открываются
```

---

## KF-4.3. UI маркетплейса

```
📁 ФАЙЛЫ:
- src/app/(app)/marketplace/page.tsx — каталог
- src/app/(app)/marketplace/[id]/page.tsx — карточка листинга
- src/app/(app)/marketplace/new/page.tsx — создание
- src/app/(app)/marketplace/my/page.tsx — мои листинги/отклики
- src/app/(app)/marketplace/dialog/[responseId]/page.tsx — чат

ПАНЕЛЬ ФИЛЬТРОВ:
— Тип: "Ищу подрядчика" / "Ищу заказ" / "Ищу суб" / "Поставка материалов"
— Специализация (drill-down дерево)
— Регион (карта с возможностью выбора)
— Бюджет (слайдер)
— Сроки
— Верифицированные бизнесы (чекбокс)

КАРТОЧКА ЛИСТИНГА:

<ListingCard>
  <Title />
  <Badges: type, region, budget, verified? />
  <Description shortened />
  <CompactProfile: name + rating + completed projects />
  <ActionButton: "Откликнуться" / "Перейти" />
</ListingCard>

СТРАНИЦА ЛИСТИНГА:

<ListingPage>
  <FullDescription />
  <Requirements />
  <Attachments />
  <AuthorProfile: полный профиль workspace из KF-2 />
  <ResponseForm if="not owner and has quota">
    — Сообщение (с шаблонами)
    — Предложенная цена
    — Предложенный срок
    — Портфолио: автопривязка к publicProfile
  </ResponseForm>
  <ExistingResponses if="is owner" />
  <SimilarListings />
</ListingPage>

ВНУТРЕННИЙ ЧАТ:

<MarketplaceDialog>
  — Real-time через WebSocket/SSE (или polling)
  — Вложения (фото, pdf)
  — Reveal-контактов после 3 сообщений обоих
  — Кнопка "Пригласить в объект" — переводит в Фазу 1/2 приглашений
</MarketplaceDialog>
```

---

## KF-4.4. Модерация и антиспам

```
📋 ЗАДАЧА: Встроенная модерация

📁 ФАЙЛЫ:
- src/app/(app)/admin/moderation/listings/page.tsx — очередь модерации
- src/lib/moderation/autoFilter.ts — автофильтр
- src/lib/moderation/escalation.ts — эскалация

АВТОМАТИЧЕСКИЕ ФИЛЬТРЫ:

1) Content filter через YandexGPT:
   prompt: "Это объявление на стройплощадке. Проверь на нарушения:
            ненормативная лексика, спам, нарушение 38-ФЗ о рекламе,
            прямые контакты в описании. Верни JSON { violations: [] }"
   Если violations не пусто — отправляем в ручную модерацию

2) Rate-лимиты и IP-проверки

3) Проверка на дубликаты (hash(title + description normalized))

КОМАНДА МОДЕРАТОРА:
— Дашборд с очередью
— Одна кнопка "Одобрить" / "Отклонить" с причиной
— История действий модератора
```

---

## KF-4.5. Монетизация маркетплейса

```
МОДЕЛЬ МОНЕТИЗАЦИИ:
— Создание и просмотр — бесплатно
— Премиум-размещение листинга: 990 ₽/30 дней (подъем вверх, бейдж "Топ")
— Приоритет в поиске для Team/Corporate (бесплатно в рамках тарифа)
— Закрытые тендеры (скрытая информация для Corporate)

ВЕРИФИКАЦИЯ БИЗНЕСА:
— Бесплатная (через ФНС, из KF-2)
— Ручная (с предоставлением документов) — 2900 ₽ разово

КОМИССИЯ ЗА СДЕЛКУ (опциональная):
— На первом запуске НЕ брать
— Ввести только после 100+ успешных сделок через площадку
```

---

## KF-4.6. Команды для Claude Code — KF-4

```bash
# Команда 1. Миграция
npx prisma migrate dev --name marketplace_listings

# Команда 2. Справочники
# Создать таблицу-справочник Specialization (древовидную)
# Seed: 50-100 специализаций под строительство

# Команда 3. API (8 эндпоинтов)
# Обязательно rate-limit по всем эндпоинтам

# Команда 4. Модерация
# AI-фильтр через YandexGPT
# UI для ручной модерации

# Команда 5. UI маркетплейса
# 5 страниц + компоненты
# Фасетный поиск (facets в API)

# Команда 6. Чат
# Если в проекте уже есть WebSocket/SSE инфраструктура — переиспользовать
# Иначе — простейший polling-чат

# Команда 7. Интеграция с KF-2
# В карточке workspace — автоподтяжка последних успешных проектов
# Рейтинг из verified reviews

# Команда 8. Биллинг премиум-размещений
# Встроить в существующую систему подписок (MODULE15)
# Новый тип: one-time payment for listing boost

# Команда 9. Юридическая документация
# Обновить оферту: раздел "Маркетплейс"
# Дисклеймеры при создании листинга
# Правила пользования площадкой

# Команда 10. Тесты
# E2E: создать листинг → отклик → чат → раскрытие контактов
# Антиспам: 10 листингов/мин → блокировка
```

**ACCEPTANCE CRITERIA KF-4:**

- [ ] Пользователь может создать листинг за < 3 минут
- [ ] Модерация проходит за < 24 часов (в автомате мгновенно)
- [ ] Фасетный поиск работает по всем фильтрам
- [ ] Рейтинг подрядчика учитывается в ранжировании
- [ ] Чат работает в реальном времени (или polling 5 сек)
- [ ] Контакты раскрываются только после активного диалога
- [ ] Премиум-размещение оплачивается и отображается в выдаче выше
- [ ] Антиспам блокирует > 95% явного спама (AI-фильтр)
- [ ] Юридические дисклеймеры отображаются везде где нужно

---

# KF-5 — Биржа дефектов/замечаний (3 недели, вместе с KF-4)

## KF-5.0. Контекст

**Ситуация:** Подрядчик не может сам устранить замечание (не его специализация, не хватает ресурса, нужна срочно команда). Раньше звонил знакомым — теперь можно разместить как мини-подряд на площадке.

**Почему вместе с KF-4:** Технически это подтип MarketplaceListing с отдельной логикой и UI, переиспользует 70% кода.

**Юридические риски:**
- Передача работ без оформления — нельзя
- Поэтому площадка — только для поиска исполнителя. Договор вне системы.
- При желании — шаблон договора подряда для скачивания.

---

## KF-5.1. Изменения в Prisma-схеме

```
📁 ФАЙЛ: prisma/schema.prisma

model DefectExchangeListing {
  id            String   @id @default(cuid())
  workspaceId   String
  workspace     Workspace @relation(fields: [workspaceId], references: [id])
  sourceDefectId String?  // связь с существующим Defect (внутренним)
  sourceProjectId String?
  createdBy     String
  creator       User     @relation(fields: [createdBy], references: [id])
  title         String
  description   String
  defectType    DefectType
  severity      DefectSeverity
  location      String   // на объекте
  region        String
  city          String?
  photoIds      String[]
  budgetMin     Float?
  budgetMax     Float?
  urgency       UrgencyLevel
  deadline      DateTime?
  status        DefectListingStatus @default(DRAFT)
  assignedToWorkspaceId String?
  completionPhotoIds String[]
  completionActId String?   // ссылка на акт устранения
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  responses     DefectResponse[]

  @@index([status, region])
}

enum DefectType {
  QUALITY_ISSUE       // брак работ
  WARRANTY_ISSUE      // гарантийный дефект
  OMISSION            // упущение
  DAMAGE              // повреждение
  DOCUMENT_ISSUE      // проблема с ИД
}

enum DefectSeverity {
  BLOCKING     // блокирует сдачу
  HIGH
  MEDIUM
  LOW
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

model DefectResponse {
  id                String   @id @default(cuid())
  listingId         String
  listing           DefectExchangeListing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  respondingWorkspaceId String
  respondingBy      String
  responder         User     @relation(fields: [respondingBy], references: [id])
  proposedPrice     Float?
  proposedDeadline  DateTime?
  message           String
  portfolioLinks    String[]
  status            ResponseStatus @default(NEW)
  createdAt         DateTime @default(now())

  @@index([listingId])
}

КОМАНДА:
npx prisma migrate dev --name defect_exchange
```

---

## KF-5.2. API и интеграция с существующими дефектами

```
📁 ФАЙЛЫ:
- src/app/api/defects/[id]/publish-to-exchange/route.ts (POST)
- src/app/api/defect-exchange/listings/route.ts (GET, POST)
- src/app/api/defect-exchange/listings/[id]/route.ts (GET, PATCH)
- src/app/api/defect-exchange/listings/[id]/respond/route.ts (POST)
- src/app/api/defect-exchange/listings/[id]/select/route.ts (POST)
- src/app/api/defect-exchange/listings/[id]/complete/route.ts (POST)

КЛЮЧЕВАЯ СПЕЦИФИКАЦИЯ:

POST /api/defects/[id]/publish-to-exchange
— Берёт существующий Defect из проекта (защитные/обычные замечания)
— Создаёт DefectExchangeListing с предзаполненными полями из Defect
— Требует: severity, urgency, бюджет (хотя бы диапазон)
— Отправляет на модерацию

POST /api/defect-exchange/listings/[id]/complete
Body: { completionPhotoIds, completionActFileId?, feedback, rating }
— Закрывает листинг
— Обновляет исходный Defect как "устранён через биржу"
— Создаёт ContractorReview для выбранного исполнителя
— Отправляет email-подтверждение

ИНТЕГРАЦИЯ С СУЩЕСТВУЮЩИМ Defect:
В карточке дефекта в проекте появляется кнопка
"Передать внешнему подрядчику на устранение" → открывает модалку публикации
```

---

## KF-5.3. UI биржи дефектов

```
📁 ФАЙЛЫ:
- src/app/(app)/defect-exchange/page.tsx — каталог
- src/app/(app)/defect-exchange/[id]/page.tsx — карточка
- src/app/(app)/defect-exchange/new/page.tsx — публикация
- src/app/(app)/defect-exchange/my/page.tsx — мои заявки и отклики
- src/components/defect-exchange/DefectCard.tsx
- src/components/defect-exchange/PublishDefectModal.tsx
- src/components/defect-exchange/CompletionForm.tsx

ОСОБЕННОСТЬ UI:

Каталог строго отфильтрован по:
- Специализация (соответствие DefectType → Specialization)
- Урочность (Сегодня / Эта неделя / ...)
- Регион (автовыбор по геолокации)
- Серьёзность

На карточке:
- Фото дефекта (из Defect)
- Локация (город, не адрес)
- Бюджет (диапазон)
- Срок
- Рейтинг заказчика (чтобы исполнитель не попал на «скандалиста»)

UX-акценты:
— Публикация из существующего Defect — 2 клика
— Акт устранения — опционально, но поощряется
— Рейтинг двусторонний: заказчик оценивает исполнителя, исполнитель заказчика
```

---

## KF-5.4. Юридические гарды

```
📋 ВАЖНО: При публикации дефекта на биржу подрядчик подтверждает:

[ ] Я понимаю, что Komplid — только площадка объявлений
[ ] Договор подряда я заключу с исполнителем самостоятельно
[ ] Я готов предоставить доступ на объект
[ ] За качество итоговой работы отвечаю я (как основной подрядчик
    перед моим заказчиком)

ШАБЛОН ДОГОВОРА:
— Скачиваемый .docx с переменными
— Генерация: подрядчик и выбранный исполнитель → заполненный договор
— Это вне биллинга, просто удобство
```

---

## KF-5.5. Команды для Claude Code — KF-5

```bash
# Команда 1. Миграция
npx prisma migrate dev --name defect_exchange

# Команда 2. API (6 эндпоинтов)

# Команда 3. UI (5 страниц + компоненты)

# Команда 4. Интеграция с Defect
# Добавить кнопку в карточку существующего дефекта

# Команда 5. Двусторонний рейтинг
# После завершения — обе стороны получают форму оценки
# Рейтинг попадает в оба профиля (из KF-2)

# Команда 6. Шаблон договора
# src/content/contracts/subcontract-template.docx с переменными
# Генерация через docxtemplater

# Команда 7. Модерация
# Переиспользовать систему из KF-4

# Команда 8. Юридические дисклеймеры
# Обновить оферту
# Отдельная страница /legal/defect-exchange-rules

# Команда 9. Тесты
# E2E: публикация дефекта → отклик → выбор исполнителя →
# акт устранения → рейтинг
```

**ACCEPTANCE CRITERIA KF-5:**

- [ ] Дефект из проекта публикуется на биржу в 2 клика
- [ ] Юридические гарды (чекбоксы) работают
- [ ] Фильтрация по специализации автоматически сопоставляется с DefectType
- [ ] После завершения — двусторонний рейтинг обязателен
- [ ] Акт устранения (опционально) прикрепляется к исходному Defect
- [ ] Рейтинг влияет на публичный профиль (KF-2)
- [ ] Шаблон субподрядного договора генерируется корректно

---

# ОБЩИЕ РАЗДЕЛЫ

## ENV-переменные (добавить к существующим)

```bash
# .env.local (основное приложение)

# Yandex Cloud
YANDEX_CLOUD_FOLDER_ID=b1g***
YANDEX_AI_KEY=AQVN***            # IAM token или API key
YANDEX_VISION_ENDPOINT=https://vision.api.cloud.yandex.net/vision/v1
YANDEX_GPT_ENDPOINT=https://llm.api.cloud.yandex.net/foundationModels/v1
YANDEX_GPT_MODEL_URI=gpt://b1g***/yandexgpt

# FNS верификация (для KF-2)
DADATA_API_KEY=                   # или checko.ru
DADATA_SECRET=

# SMS (для Фазы 2)
SMS_PROVIDER=smsru                 # или smsc, smsaero
SMS_API_KEY=
SMS_SENDER=Komplid

# Лимиты
OCR_FREE_MONTHLY_LIMIT=5
OCR_TEAM_MONTHLY_LIMIT=100
AI_COMPLIANCE_FREE_MONTHLY_LIMIT=5
AI_COMPLIANCE_TEAM_MONTHLY_LIMIT=50
AI_LAWYER_DAILY_LIMIT=20

# Модерация (для KF-4, KF-5)
MARKETPLACE_AUTO_PUBLISH=false    # на старте всё через ручную модерацию
MARKETPLACE_BOOST_PRICE_RUB=990

# URLs
NEXT_PUBLIC_MARKETING_URL=https://komplid.ru
NEXT_PUBLIC_APP_URL=https://app.komplid.ru
```

---

## Порядок внедрения (последовательная дорожная карта)

### Месяц 1 (недели 1-4) — Фундамент виральности

| Неделя | Фазы/Фичи                                      | Зависимости                |
|--------|------------------------------------------------|----------------------------|
| 1      | Фаза 1 — публичные дашборды (начало)           | Prisma-миграция            |
| 2      | Фаза 1 — завершение + KF-2 портфолио           | Используется Фаза 1        |
| 3      | KF-1 — AI-проверка ИД (начало, 1-я нед)        | Yandex GPT интеграция      |
| 4      | KF-1 — завершение + KF-3 OCR (начало)          | Yandex Vision интеграция   |

### Месяц 2 (недели 5-8) — Гостевой кабинет и OCR

| Неделя | Фазы/Фичи                                      |
|--------|------------------------------------------------|
| 5      | Фаза 2 — гостевой кабинет (Prisma + API)       |
| 6      | Фаза 2 — UI + SMS-подпись + KF-3 (парсеры)     |
| 7      | Фаза 2 — завершение + KF-3 (UI мастер)         |
| 8      | KF-3 — завершение + тесты, оптимизация         |

### Месяц 3-4 (недели 9-16) — B2C «Мой Ремонт»

| Неделя  | Этапы                                         |
|---------|-----------------------------------------------|
| 9-10    | Фаза 3 — модели + API                         |
| 11-12   | Фаза 3 — UI и онбординг                       |
| 13      | Фаза 3 — контент: чек-листы + шаблоны         |
| 14      | Фаза 3 — AI-юрист + подписки                  |
| 15      | Лендинг /dlya-zakazchika в komplid-marketing  |
| 16      | Отладка, закрытое бета-тестирование B2C       |

### Месяц 5-6 — Стабилизация и рост

— Мониторинг метрик виральности
— Допил UI/UX на основе фидбека
— Контент-маркетинг (см. MODULE_MARKETING_PLAN)

### Месяц 6+ — Маркетплейс (когда 1000+ активных)

| Неделя | Этапы                                          |
|--------|------------------------------------------------|
| 17     | KF-4 Prisma + API                              |
| 18     | KF-4 UI + модерация                            |
| 19     | KF-5 биржа дефектов                            |
| 20     | Тесты, юридические документы, запуск в бете    |

---

## Критерии готовности всего модуля

### Бизнес-метрики (после 3 месяцев работы):

- [ ] Конверсия публичной ссылки в регистрацию нового подрядчика: > 2%
- [ ] Количество приглашённых гостей (Фаза 2) у подрядчика: среднее > 1.5
- [ ] Конверсия B2C-заказчика в Pro: > 8%
- [ ] AI-проверка ИД: > 60% проектов перед сдачей используют её
- [ ] OCR: > 30% актов приходят через OCR (а не ручной ввод)
- [ ] Публичные портфолио: 80% активных подрядчиков имеют заполненный профиль
- [ ] Viral coefficient (K): > 0.5 (каждый пользователь приводит 0.5 нового)

### Технические метрики:

- [ ] Lighthouse > 90 на всех публичных страницах
- [ ] P95 ответа API < 500 мс
- [ ] P95 запуска AI-проверки до готовности: < 5 мин для среднего проекта
- [ ] P95 OCR одной страницы: < 30 сек
- [ ] Доступность сервисов: 99.5%
- [ ] Затраты на YandexGPT+Vision: < 15% от выручки Pro-тарифов

---

## Связь с другими планами

| Модуль/План           | Что связано                                            |
|-----------------------|--------------------------------------------------------|
| SUBSCRIPTION_SYSTEM   | Добавляется тариф customer_pro, новые featureCodes     |
| MODULE15 (Подписки)   | Paywall-проверки для всех Pro-фич (AI-юрист, чек-листы)|
| MODULE16 (Рефералы)   | Публичные дашборды — источник реферального трафика     |
| MODULE_MARKETING      | Лендинги /dlya-zakazchika, /companies, статьи          |
| Модуль 14 (ИСУП)      | Пересечения нет — госзаказчики не используют портал    |
| Модуль 17 (AI)        | Переиспользование AI-инфраструктуры                    |
| Модуль 18 (Мобильное) | Гостевой кабинет должен работать в PWA                 |

---

## Риски и митигации

| Риск                                          | Митигация                                          |
|-----------------------------------------------|----------------------------------------------------|
| Подрядчик саботирует публичность (боится showing проблем) | Фото с замечаниями автоматически скрываются. Денежные суммы опциональны. |
| AI-проверка выдаёт ложные срабатывания        | Детерминированные правила + возможность "Игнорировать" с аудитом |
| OCR плохо работает на плохих сканах           | Двустадийная проверка (OCR → YandexGPT для структурирования). Manual review обязателен при confidence < 0.85 |
| B2C рынок не захватывает                      | Запускаем параллельно Прораб-Журналу, чтобы не бросать основной бизнес |
| Маркетплейс — пустая площадка                 | НЕ запускать пока < 1000 активных. Параллельный импорт подрядчиков из публичных источников для seed |
| Юридические риски маркетплейса/биржи          | Оферта, дисклеймеры, модерация, YandexGPT AI-фильтр |
| Рост стоимости YandexGPT                      | Переход на собственные модели (Gemma/Saiga) для простых задач |

---

## Чек-лист прежде чем отдавать в Claude Code

Перед тем как начать кодить по этому плану, убедись что:

- [ ] Реализованы и смержены MODULE15 (Подписки) и MODULE16 (Рефералы)
- [ ] Модели Workspace, Project, Document, Defect существуют
- [ ] Есть инфраструктура очередей (BullMQ, pg-boss или graphile-worker)
- [ ] Настроен storage для файлов (S3-совместимое хранилище)
- [ ] Настроены основные транзакционные письма (есть src/lib/email)
- [ ] Есть rate-limit middleware
- [ ] Yandex Cloud аккаунт оплачен и service account настроен
- [ ] SMS-провайдер выбран и интегрирован (для Фазы 2)
- [ ] Dadata или Checko подключен (для KF-2 верификации)

---

## FINAL — команда запуска реализации

Отдавать в Claude Code по одному разделу за раз. Оптимальный подход:

1. Прочитать с Claude весь этот документ — создать план задач в TODO
2. Начать с раздела "1.1 Изменения в Prisma-схеме" — применить и смержить
3. Далее по порядку 1.2 → 1.3 → 1.4 → 1.5
4. После прохождения Фазы 1 — тестовое развёртывание в staging
5. Собрать обратную связь (можно прогнать через первых 10 реальных подрядчиков)
6. Дальше — KF-2 параллельно с Фазой 2 по тому же принципу

**Правило работы с Claude Code:**

```
1 раздел → 1 feature branch → 1 PR → ревью → merge → тест на staging → переход к следующему
```

Не пытаться сделать всё одним большим PR — сохрани себе нервы при ревью.

---

_Документ готов к передаче в Claude Code._
_Рекомендуемый порядок: Фаза 1 → KF-2 параллельно → KF-1 → Фаза 2 → KF-3 → Фаза 3 → (спустя месяцы) KF-4 + KF-5._

