# AUTH_ONBOARDING_ROLES_PLAN.md — Модернизация регистрации, онбординга и ролей

> **Репозиторий:** `stroydocs/` (основное приложение, `app.komplid.ru`)
> **Предусловие для MODULE17_PLAN** — этот план должен быть реализован ПЕРЕД порталом заказчика и killer-фичами.
> **Стек:** Next.js 15 App Router + TypeScript + Prisma + PostgreSQL + Tailwind + shadcn/ui + NextAuth (Auth.js v5)
> **Зависимости от уже реализованного:**
> - `SUBSCRIPTION_SYSTEM.md` — `SubscriptionPlan`, `SubscriptionFeature`, `featureCodes`, биллинг
> - `MODULE15_PLAN.md` — Профи-пакеты (Сметчик-Студио, ИД-Мастер, Прораб-Журнал) по 1 900 ₽/мес + B2B (Team, Corporate)
> - `MODULE16_PLAN.md` — реферальная программа `/ref/[code]`, UTM-аналитика, `Referral`, `ReferralReward`
> - `MODULE_MARKETING_PLAN.md` — лендинги `/smetchik`, `/pto`, `/prorab`, `/solutions/*`, UTM-трекинг → `app.komplid.ru`
>
> **Цель:** Подготовить фундамент ролей/тарифов/онбординга **до того**, как стартует MODULE17. Иначе Фаза 2 (гостевой кабинет) и Фаза 3 («Мой Ремонт») столкнутся с недостроенной системой ролей.
>
> **Общий бюджет:** 4-6 недель.

---

## 0. Зачем этот план ПЕРЕД MODULE17

Аудит показывает узкие места, которые блокируют корректную реализацию MODULE17:

1. **Регистрация не знает контекста.** Пользователь приходит с `komplid.ru/pto` (хочет ИД-Мастер 1 900 ₽/мес) — а попадает на generic форму без выбора тарифа и без UTM-трекинга. Реферальный код `?ref=ABC123` теряется.

2. **Онбординг не ведёт к первой ценности.** После регистрации юзер видит пустой app, не понимая: завести workspace? выбрать тариф? пригласить коллегу?

3. **Роль `CUSTOMER` нужна в `WorkspaceRole` сейчас.** Если добавить её позже вместе с Фазой 3 — придётся делать вторую миграцию с переносом данных.

4. **Матрица прав плохо централизована.** Нет единого `src/lib/permissions/matrix.ts`, права проверяются в каждом endpoint отдельно. Добавить в эту мешанину ещё Фазу 2 (GUEST) и Фазу 3 (CUSTOMER) = непредсказуемый баг-фонтан.

5. **Нет `ProjectMember`.** Сейчас роли только на уровне Workspace. Но бригадир может работать на 3 из 20 объектов компании — а в текущей модели либо видит всё, либо ничего.

6. **Paywall разрозненный.** Каждый feature-gate пишется вручную. Нужен единый `<PaywallGate feature="...">`.

---

## 1. Карта фаз

```
┌──────────────────────────────────────────────────────────────────────┐
│ Фаза A1 │ Аудит и унификация                          │ 3 дня  │ ⬜  │
│ Фаза A2 │ Prisma — роли, членства, feature-коды       │ 3 дня  │ ⬜  │
│ Фаза A3 │ Permissions matrix — централизация          │ 4 дня  │ ⬜  │
├──────────────────────────────────────────────────────────────────────┤
│ Фаза B1 │ Регистрация: context-aware landing           │ 5 дней │ ⬜  │
│ Фаза B2 │ Онбординг-мастер                            │ 5 дней │ ⬜  │
│ Фаза B3 │ Pricing-страница и paywall                   │ 4 дня  │ ⬜  │
├──────────────────────────────────────────────────────────────────────┤
│ Фаза C1 │ Управление членами workspace (UI)            │ 4 дня  │ ⬜  │
│ Фаза C2 │ ProjectMember — роли в проекте               │ 5 дней │ ⬜  │
│ Фаза C3 │ Workspace-switcher и личный профиль          │ 3 дня  │ ⬜  │
├──────────────────────────────────────────────────────────────────────┤
│ Фаза D1 │ Feature-flags / PaywallGate компонент       │ 3 дня  │ ⬜  │
│ Фаза D2 │ Audit log и security                         │ 2 дня  │ ⬜  │
└──────────────────────────────────────────────────────────────────────┘
```

**Общая последовательность:** A → B → C → D. Внутри каждого блока — строго по порядку, без параллелизма.

---

## 1.0. Общие принципы (те же, что в MODULE17)

- TypeScript strict mode
- Все API — Next.js route handlers, Zod-валидация
- Prisma-транзакции для атомарности
- Логирование через `src/lib/logger.ts`
- Ошибки в формате `{ error: { code, message } }` с i18n-ключами
- Мобильная адаптация всех форм (особенно регистрации)
- Соответствие дизайн-токенам из `globals.css` (OKLch-палитра Steel)

---

# ФАЗА A — ФУНДАМЕНТ (1.5-2 недели)

# A1. Аудит и унификация

## A1.1. Что проверить в текущем коде

```
📋 ЗАДАЧА: Сверить текущее состояние с MODULE15/16 и SUBSCRIPTION_SYSTEM

ШАГИ (Claude Code делает ручной аудит, не пишет код):

1. prisma/schema.prisma — какие enum'ы и модели уже есть:
   [ ] enum WorkspaceRole — какие значения?
   [ ] model Workspace — все ли поля из MODULE15?
   [ ] model WorkspaceMember — поле role, guestScope?
   [ ] model User — все ли поля (referralCode, utm_*, signupSource)?
   [ ] model SubscriptionPlan — какие planId существуют?
   [ ] model Subscription — связь с Workspace или User?
   [ ] model SubscriptionFeature — таблица feature-кодов
   [ ] model Referral / ReferralReward — MODULE16

2. src/lib/auth.ts — существующая логика:
   [ ] Функция requireRole — что она принимает?
   [ ] Функция getCurrentWorkspace — как определяется текущий WS?
   [ ] getServerSession — NextAuth v5 настроен корректно?

3. src/app/(auth)/signin, signup, forgot-password:
   [ ] Какие формы и поля существуют?
   [ ] Есть ли логика читать UTM из cookies?
   [ ] Обрабатывается ли ?ref=CODE параметр?

4. src/app/api/auth/[...nextauth]/route.ts:
   [ ] Какие провайдеры подключены (credentials, Google, Yandex)?
   [ ] Что лежит в session.user?

5. Таблица FEATURE_CODES (если есть константный список):
   [ ] Проверить какие коды уже используются в коде
   [ ] Убедиться что все из MODULE15 зарегистрированы

РЕЗУЛЬТАТ АУДИТА: короткий отчёт в виде файла
docs/audit-auth-2026-04.md со списком "есть / нет / надо доделать".
```

## A1.2. Унификация именования

```
📋 ЗАДАЧА: Привести именование к единому стандарту

ПРОБЛЕМА: В проекте могут быть смешаны
   - subscriptionPlan.id / planCode / planSlug
   - workspace.role / workspaceMember.role
   - feature.code / feature.slug / feature.key

РЕШЕНИЕ: единый стандарт
   - Все коды (feature, plan, role) — UPPER_SNAKE_CASE строки
   - В Prisma: поле `code: String @unique`
   - В TypeScript — enum'ы ИЛИ const assertions
   - Для ролей: WorkspaceRole (Prisma enum) — OWNER, ADMIN, ...
   - Для фичей: FEATURE_CODES как const as const в src/lib/features/codes.ts

СОЗДАТЬ: src/lib/features/codes.ts

export const FEATURE_CODES = {
  // B2C Профи-пакеты
  SMETCHIK_STUDIO_ACCESS: 'SMETCHIK_STUDIO_ACCESS',
  ID_MASTER_ACCESS: 'ID_MASTER_ACCESS',
  PRORAB_JOURNAL_ACCESS: 'PRORAB_JOURNAL_ACCESS',

  // B2B
  TEAM_MULTI_USER: 'TEAM_MULTI_USER',
  CORPORATE_ISUP_INTEGRATION: 'CORPORATE_ISUP_INTEGRATION',

  // Общие
  AI_COMPLIANCE_CHECK: 'AI_COMPLIANCE_CHECK',
  OCR_SCAN: 'OCR_SCAN',
  PUBLIC_DASHBOARD: 'PUBLIC_DASHBOARD',
  GUEST_INVITATION: 'GUEST_INVITATION',

  // Будущие — резервируем сейчас, чтобы не ломать миграции
  CUSTOMER_HIDDEN_WORKS_CHECKLISTS: 'CUSTOMER_HIDDEN_WORKS_CHECKLISTS',
  CUSTOMER_AI_LAWYER: 'CUSTOMER_AI_LAWYER',
  CUSTOMER_CLAIM_TEMPLATES: 'CUSTOMER_CLAIM_TEMPLATES',
  MARKETPLACE_BOOST: 'MARKETPLACE_BOOST',
} as const;

export type FeatureCode = keyof typeof FEATURE_CODES;

КОМАНДА для Claude Code:
- Найти все места где используются feature-коды строками
- Переписать на FEATURE_CODES.XXX
- Tests pass.
```

**ACCEPTANCE A1:**
- [ ] Отчёт аудита создан в `docs/audit-auth-2026-04.md`
- [ ] Все feature-коды приведены к единому реестру в `src/lib/features/codes.ts`
- [ ] Линтер-правило запрещает использовать feature-коды как сырые строки (ESLint custom rule или ts-morph check)

---

# A2. Prisma — роли, членства, feature-коды

## A2.1. Расширение ролей

```
📋 ЗАДАЧА: Добавить недостающие значения в enum'ы

📁 ФАЙЛ: prisma/schema.prisma

ШАГ 1. Расширить WorkspaceRole:

enum WorkspaceRole {
  OWNER
  ADMIN
  MANAGER
  FOREMAN       // НОВЫЙ — прораб (отделяем от WORKER)
  ENGINEER      // НОВЫЙ — ПТО / сметчик
  WORKER
  GUEST
  CUSTOMER      // НОВЫЙ — B2C заказчик (будет использоваться в MODULE17 Фаза 3)
}

ШАГ 2. Добавить тип аккаунта на уровне User:

enum UserAccountType {
  INDIVIDUAL       // физлицо
  SELF_EMPLOYED    // самозанятый
  ENTREPRENEUR     // ИП
  LEGAL_ENTITY     // юрлицо
  UNKNOWN          // не указал
}

enum UserIntent {
  CONTRACTOR_GENERAL       // генподрядчик
  CONTRACTOR_SUB           // субподрядчик
  CONTRACTOR_INDIVIDUAL    // бригадир / прораб-одиночка
  ESTIMATOR                // сметчик
  PTO_ENGINEER             // ПТО-инженер
  CUSTOMER_PRIVATE         // частный заказчик (ИЖС/ремонт)
  CUSTOMER_B2B             // корпоративный заказчик
  CONSTRUCTION_SUPERVISOR  // технадзор
  UNKNOWN
}

ШАГ 3. Обновить модель User:

model User {
  // ... существующие поля
  accountType        UserAccountType @default(UNKNOWN)
  intent             UserIntent      @default(UNKNOWN)
  fullName           String?
  inn                String?         // опционально, для верификации
  onboardingCompleted Boolean        @default(false)
  onboardingStep     String?         // "workspace_created", "plan_chosen", ...

  // Маркетинг-трекинг (ссылка с MODULE16)
  signupSource       String?         // "/smetchik", "/pto", "/ref/ABC"
  referralCode       String?         @unique
  referredByCode     String?
  utmSource          String?
  utmMedium          String?
  utmCampaign        String?
  utmContent         String?
  utmTerm            String?
  firstTouchAt       DateTime?
  signupIpHash       String?
  signupUserAgent    String?

  @@index([referralCode])
  @@index([referredByCode])
}

КОМАНДА МИГРАЦИИ:
npx prisma migrate dev --name user_intent_and_extended_roles
npx prisma generate

ВАЖНО: После миграции запустить backfill-скрипт для существующих пользователей:
scripts/backfill-user-intent.ts — проставляет UNKNOWN/UNKNOWN всем существующим
```

## A2.2. Модель WorkspaceMember — унификация

```
📋 ЗАДАЧА: Уточнить модель WorkspaceMember

📁 ФАЙЛ: prisma/schema.prisma

model WorkspaceMember {
  id              String   @id @default(cuid())
  workspaceId     String
  workspace       Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role            WorkspaceRole
  specialization  String?           // "сметчик", "прораб", ...
  title           String?           // должность как напишет владелец
  guestScope      Json?             // только для GUEST/CUSTOMER
  invitedBy       String?           // кто пригласил
  invitedAt       DateTime?
  acceptedAt      DateTime?
  lastActiveAt    DateTime?
  status          MemberStatus @default(ACTIVE)
  deactivatedAt   DateTime?
  deactivationReason String?

  @@unique([workspaceId, userId])
  @@index([userId, status])
  @@index([workspaceId, role])
}

enum MemberStatus {
  ACTIVE
  SUSPENDED     // временно отключён (например, за неуплату)
  DEACTIVATED   // выгнан
  LEFT          // сам ушёл
}

КОМАНДА:
npx prisma migrate dev --name workspace_member_status
```

## A2.3. SubscriptionFeature — таблица фичей

```
📋 ЗАДАЧА: Прикрепить фичи к планам через отдельную модель

📁 ФАЙЛ: prisma/schema.prisma

// Если в MODULE15 уже есть — пропустить
// Если нет или упрощённая — добавить/доработать

model SubscriptionFeature {
  id            String   @id @default(cuid())
  code          String   @unique   // FEATURE_CODES.XXX
  displayName   String
  description   String?
  category      FeatureCategory
  isLimited     Boolean  @default(false)  // если true — имеет числовой лимит
  defaultLimit  Int?                      // дефолтный лимит (для Free)

  planFeatures  PlanFeature[]
}

enum FeatureCategory {
  CORE
  B2C_SMETCHIK
  B2C_PTO
  B2C_PRORAB
  B2C_CUSTOMER
  B2B
  AI
  INTEGRATIONS
  MARKETPLACE
}

model PlanFeature {
  id         String   @id @default(cuid())
  planId     String
  plan       SubscriptionPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  featureId  String
  feature    SubscriptionFeature @relation(fields: [featureId], references: [id])
  included   Boolean  @default(true)
  limit      Int?     // null = unlimited

  @@unique([planId, featureId])
  @@index([featureId])
}

КОМАНДА:
npx prisma migrate dev --name subscription_feature_matrix

SEED: prisma/seed/features.ts — зарегистрировать все FEATURE_CODES
SEED: prisma/seed/plan-features.ts — связать планы с фичами

ОБЯЗАТЕЛЬНЫЕ связки (проверить что соответствует MODULE15):

Free (B2B):
 - CORE minimum

Прораб-Журнал (1 900 ₽):
 - PRORAB_JOURNAL_ACCESS
 - 50 проектов
 - Без AI_COMPLIANCE_CHECK

Сметчик-Студио (1 900 ₽):
 - SMETCHIK_STUDIO_ACCESS
 - AI_SMETA_IMPORT

ИД-Мастер (1 900 ₽):
 - ID_MASTER_ACCESS
 - AI_COMPLIANCE_CHECK (лимит 5/мес)
 - OCR_SCAN (лимит 5/мес)

Team (от 4 900 ₽):
 - Всё из Профи + TEAM_MULTI_USER + PUBLIC_DASHBOARD + GUEST_INVITATION

Corporate (от 19 900 ₽):
 - Всё + CORPORATE_ISUP_INTEGRATION + unlimited AI/OCR
```

**ACCEPTANCE A2:**
- [ ] Миграции применены чисто, без конфликтов
- [ ] Backfill-скрипт проставил UNKNOWN всем существующим юзерам
- [ ] Seed для фичей и связок фича↔план прошёл, в БД видны все FEATURE_CODES
- [ ] `prisma.subscriptionFeature.findMany()` возвращает все ожидаемые записи

---

# A3. Permissions matrix — централизация

## A3.1. Единый файл матрицы прав

```
📋 ЗАДАЧА: Создать центральную систему прав

📁 ФАЙЛЫ:
- src/lib/permissions/matrix.ts          — декларативная матрица
- src/lib/permissions/check.ts            — hasPermission / requirePermission
- src/lib/permissions/types.ts            — типы
- src/lib/permissions/actions.ts          — константы действий

ШАГ 1. Создать src/lib/permissions/actions.ts:

export const ACTIONS = {
  // Workspace
  WORKSPACE_MANAGE_MEMBERS: 'workspace.manage_members',
  WORKSPACE_MANAGE_BILLING: 'workspace.manage_billing',
  WORKSPACE_DELETE: 'workspace.delete',
  WORKSPACE_EDIT_PROFILE: 'workspace.edit_profile',
  WORKSPACE_INVITE_GUEST: 'workspace.invite_guest',

  // Projects
  PROJECT_CREATE: 'project.create',
  PROJECT_VIEW: 'project.view',
  PROJECT_EDIT: 'project.edit',
  PROJECT_DELETE: 'project.delete',
  PROJECT_PUBLISH_DASHBOARD: 'project.publish_dashboard',
  PROJECT_MANAGE_MEMBERS: 'project.manage_members',

  // Documents
  DOCUMENT_CREATE: 'document.create',
  DOCUMENT_EDIT: 'document.edit',
  DOCUMENT_DELETE: 'document.delete',
  DOCUMENT_SIGN: 'document.sign',
  DOCUMENT_VIEW_COSTS: 'document.view_costs',

  // Estimates
  ESTIMATE_CREATE: 'estimate.create',
  ESTIMATE_EDIT: 'estimate.edit',
  ESTIMATE_VIEW_PRICES: 'estimate.view_prices',

  // Photos
  PHOTO_UPLOAD: 'photo.upload',
  PHOTO_DELETE: 'photo.delete',
  PHOTO_VIEW_PRIVATE: 'photo.view_private',

  // Comments
  COMMENT_CREATE: 'comment.create',
  COMMENT_RESOLVE: 'comment.resolve',

  // Marketplace (для будущего KF-4)
  MARKETPLACE_CREATE_LISTING: 'marketplace.create_listing',
  MARKETPLACE_RESPOND: 'marketplace.respond',
} as const;

export type Action = typeof ACTIONS[keyof typeof ACTIONS];

ШАГ 2. Создать src/lib/permissions/matrix.ts:

import { WorkspaceRole } from '@prisma/client';
import { ACTIONS, Action } from './actions';

// Явная декларация: какая роль что может
// Если нет в матрице — запрещено
export const PERMISSION_MATRIX: Record<WorkspaceRole, Action[]> = {
  OWNER: Object.values(ACTIONS),  // всё

  ADMIN: [
    ACTIONS.WORKSPACE_MANAGE_MEMBERS,
    ACTIONS.WORKSPACE_EDIT_PROFILE,
    ACTIONS.WORKSPACE_INVITE_GUEST,
    ACTIONS.PROJECT_CREATE,
    ACTIONS.PROJECT_VIEW,
    ACTIONS.PROJECT_EDIT,
    ACTIONS.PROJECT_DELETE,
    ACTIONS.PROJECT_PUBLISH_DASHBOARD,
    ACTIONS.PROJECT_MANAGE_MEMBERS,
    ACTIONS.DOCUMENT_CREATE,
    ACTIONS.DOCUMENT_EDIT,
    ACTIONS.DOCUMENT_DELETE,
    ACTIONS.DOCUMENT_SIGN,
    ACTIONS.DOCUMENT_VIEW_COSTS,
    ACTIONS.ESTIMATE_CREATE,
    ACTIONS.ESTIMATE_EDIT,
    ACTIONS.ESTIMATE_VIEW_PRICES,
    ACTIONS.PHOTO_UPLOAD,
    ACTIONS.PHOTO_DELETE,
    ACTIONS.PHOTO_VIEW_PRIVATE,
    ACTIONS.COMMENT_CREATE,
    ACTIONS.COMMENT_RESOLVE,
    ACTIONS.MARKETPLACE_CREATE_LISTING,
    ACTIONS.MARKETPLACE_RESPOND,
  ],

  MANAGER: [
    ACTIONS.PROJECT_VIEW,
    ACTIONS.PROJECT_EDIT,
    ACTIONS.PROJECT_MANAGE_MEMBERS,
    ACTIONS.DOCUMENT_CREATE,
    ACTIONS.DOCUMENT_EDIT,
    ACTIONS.DOCUMENT_SIGN,
    ACTIONS.DOCUMENT_VIEW_COSTS,
    ACTIONS.ESTIMATE_CREATE,
    ACTIONS.ESTIMATE_EDIT,
    ACTIONS.ESTIMATE_VIEW_PRICES,
    ACTIONS.PHOTO_UPLOAD,
    ACTIONS.PHOTO_VIEW_PRIVATE,
    ACTIONS.COMMENT_CREATE,
    ACTIONS.COMMENT_RESOLVE,
  ],

  ENGINEER: [
    ACTIONS.PROJECT_VIEW,
    ACTIONS.DOCUMENT_CREATE,
    ACTIONS.DOCUMENT_EDIT,
    ACTIONS.DOCUMENT_SIGN,
    ACTIONS.ESTIMATE_CREATE,
    ACTIONS.ESTIMATE_EDIT,
    ACTIONS.ESTIMATE_VIEW_PRICES,
    ACTIONS.PHOTO_UPLOAD,
    ACTIONS.PHOTO_VIEW_PRIVATE,
    ACTIONS.COMMENT_CREATE,
  ],

  FOREMAN: [
    ACTIONS.PROJECT_VIEW,
    ACTIONS.DOCUMENT_CREATE,
    ACTIONS.DOCUMENT_EDIT,
    ACTIONS.PHOTO_UPLOAD,
    ACTIONS.COMMENT_CREATE,
    ACTIONS.COMMENT_RESOLVE,
  ],

  WORKER: [
    ACTIONS.PROJECT_VIEW,
    ACTIONS.PHOTO_UPLOAD,
    ACTIONS.COMMENT_CREATE,
  ],

  GUEST: [
    ACTIONS.PROJECT_VIEW,            // только ограниченный scope
    ACTIONS.COMMENT_CREATE,
    // DOCUMENT_SIGN добавляется через guestScope.permissions.canSignActs
  ],

  CUSTOMER: [
    ACTIONS.PROJECT_VIEW,
    ACTIONS.PROJECT_CREATE,          // может создать свой объект (Мой Ремонт)
    ACTIONS.PROJECT_EDIT,            // свои объекты
    ACTIONS.DOCUMENT_VIEW_COSTS,
    ACTIONS.PHOTO_UPLOAD,
    ACTIONS.COMMENT_CREATE,
  ],
};

ШАГ 3. Создать src/lib/permissions/check.ts:

export function hasPermission(
  role: WorkspaceRole,
  action: Action,
  context?: {
    guestScope?: GuestScope;
    memberOwnsResource?: boolean;
  }
): boolean {
  const allowed = PERMISSION_MATRIX[role]?.includes(action) ?? false;
  if (!allowed) return false;

  // Специальные контекстные правила
  if (role === 'GUEST' && context?.guestScope) {
    // Подписание актов — только если явно разрешено в guestScope
    if (action === ACTIONS.DOCUMENT_SIGN) {
      return context.guestScope.permissions?.canSignActs === true;
    }
    // Просмотр стоимостей — только если разрешено
    if (action === ACTIONS.DOCUMENT_VIEW_COSTS) {
      return context.guestScope.permissions?.canViewCosts === true;
    }
  }

  return true;
}

export async function requirePermission(
  userId: string,
  workspaceId: string,
  action: Action,
  context?: PermissionContext
) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } }
  });
  if (!member || member.status !== 'ACTIVE') {
    throw new ForbiddenError('Not a member');
  }
  const ctx = { guestScope: member.guestScope as GuestScope, ...context };
  if (!hasPermission(member.role, action, ctx)) {
    throw new ForbiddenError(`Action ${action} not allowed for role ${member.role}`);
  }
  return member;
}
```

## A3.2. Миграция существующих эндпоинтов

```
📋 ЗАДАЧА: Переписать все API endpoints на requirePermission

ПРОЦЕСС:
1. Claude Code сканирует src/app/api/**/*.ts
2. Для каждого endpoint — определяет требуемое действие
3. Заменяет ad-hoc проверки (role === 'OWNER' и т.п.) на requirePermission(...)
4. Добавляет импорты из @/lib/permissions

ПРИМЕР ДО:
if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
  return Response.json({ error: '...' }, { status: 403 });
}

ПРИМЕР ПОСЛЕ:
await requirePermission(session.userId, params.workspaceId, ACTIONS.PROJECT_DELETE);

КОМАНДА:
npm run codemod:permissions   # если написан codemod
# или вручную пройтись

ТЕСТЫ:
- test/permissions/matrix.test.ts — unit-тесты для hasPermission
- test/permissions/e2e.test.ts — E2E-тесты по основным сценариям ролей
```

**ACCEPTANCE A3:**
- [ ] Матрица прав живёт в одном файле
- [ ] `hasPermission` покрыта unit-тестами (все роли × все действия)
- [ ] Все API-эндпоинты используют `requirePermission`
- [ ] ESLint-правило запрещает писать `role === 'OWNER'` вне `src/lib/permissions/`

---

# ФАЗА B — РЕГИСТРАЦИЯ И ОНБОРДИНГ (2 недели)

# B1. Context-aware landing — регистрация, которая знает откуда ты

## B1.0. Ключевая идея

Пользователь может прийти из шести разных источников, и форма регистрации должна подстраиваться:

| Источник                              | Что дать по умолчанию                                    |
|---------------------------------------|----------------------------------------------------------|
| `komplid.ru/smetchik` + CTA           | preset `plan=smetchik_studio`, intent=ESTIMATOR          |
| `komplid.ru/pto` + CTA                | preset `plan=id_master`, intent=PTO_ENGINEER             |
| `komplid.ru/prorab` + CTA             | preset `plan=prorab_journal`, intent=CONTRACTOR_INDIVIDUAL|
| `komplid.ru/solutions/general-contractor` | preset `plan=team`, intent=CONTRACTOR_GENERAL         |
| `komplid.ru/dlya-zakazchika`          | preset `plan=customer_free`, intent=CUSTOMER_PRIVATE     |
| `komplid.ru/ref/ABC123`               | preset по сегменту рефералла + `referredByCode=ABC123`   |
| Прямо на `app.komplid.ru/signup`      | generic — выбор на шаге онбординга                       |

## B1.1. URL и query-параметры

```
📋 СОГЛАШЕНИЕ О URL:

https://app.komplid.ru/signup
  ?plan=smetchik_studio    # preset плана
  &intent=ESTIMATOR        # preset намерения
  &ref=ABC123              # реферальный код
  &utm_source=yandex
  &utm_medium=cpc
  &utm_campaign=pto_q2
  &utm_content=banner_top
  &utm_term=скачать+аоср

КОМАНДА для Claude Code:
1. src/app/(auth)/signup/page.tsx — принимает searchParams
2. Если переданы utm_* и ref — кладёт в сессионную cookie
   signupContext на 30 дней (SameSite=Lax, HttpOnly)
3. Если preset plan и intent есть — подсвечивает их в форме

SERVER ACTIONS:
- src/lib/tracking/signupContext.ts
  - setSignupContext(cookies, ctx)
  - getSignupContext(cookies)
  - clearSignupContext(cookies)
```

## B1.2. Маршрут `/ref/[code]` (интеграция с MODULE16)

```
📋 ЗАДАЧА: Уточнить редирект с реферальной ссылки

📁 ФАЙЛ: src/app/ref/[code]/page.tsx
(если уже реализован в MODULE16 — только убедиться в совпадении)

ЛОГИКА:
1. Получаем [code]
2. Проверяем в БД Referral.code — если валиден:
   - Узнаём сегмент реферера (его intent и план)
   - Узнаём тип reward (скидка? бесплатный месяц?)
3. Кладём в cookie signupContext:
   referredByCode=<code>, intent=<segment>, plan=<suggested>
4. Редирект на /signup с теми же query-параметрами

ВАЖНО: Реферальная cookie живёт 30 дней. Если за это время пользователь
зарегистрируется — засчитывается реферал.

ТРЕБОВАНИЯ:
- Если код невалиден — 404 с подсказкой "проверьте ссылку"
- Если код валиден но исчерпан лимит наград — всё равно засчитывается
  (просто reward=0)
- Логируется в ReferralClick для аналитики (уже должно быть в MODULE16)
```

## B1.3. Новая форма регистрации

```
📋 ЗАДАЧА: Переписать src/app/(auth)/signup/page.tsx

📁 ФАЙЛЫ:
- src/app/(auth)/signup/page.tsx
- src/components/auth/SignupForm.tsx
- src/components/auth/SignupHero.tsx          (левый блок с контекстом)
- src/components/auth/PlanPreviewCard.tsx     (мини-карточка preset-плана)
- src/components/auth/ReferralBonusBadge.tsx

СТРУКТУРА СТРАНИЦЫ:

<SignupLayout>
  <SignupHero>
    {/* Левая колонка: меняется в зависимости от intent */}
    {intent === 'ESTIMATOR' && (
      <>
        <h1>Сметчик-Студио</h1>
        <p>Профессиональные сметы за 15 минут</p>
        <ul>
          <li>✓ AI-импорт чертежей</li>
          <li>✓ ГЭСН/ТЕР базы</li>
          <li>✓ Публикация ссылкой заказчику</li>
        </ul>
        <PlanPreviewCard planCode="smetchik_studio" />
      </>
    )}
    {intent === 'PTO_ENGINEER' && (<>... ИД-Мастер ...</>)}
    {intent === 'CUSTOMER_PRIVATE' && (<>... Мой Ремонт — бесплатно ...</>)}
    {/* default generic hero */}

    {referredByCode && <ReferralBonusBadge code={referredByCode} />}
  </SignupHero>

  <SignupForm>
    {/* Правая колонка: сама форма */}
    <SocialAuthButtons>
      {/* Яндекс, Google, ВК если настроены */}
    </SocialAuthButtons>

    <Separator>или</Separator>

    <EmailSignupFields>
      — Email
      — Телефон (опционально, но рекомендуется для SMS-подписи)
      — Пароль (+ requirements hint)
      — ФИО
    </EmailSignupFields>

    <TermsCheckbox>
      Я принимаю оферту и политику конфиденциальности
    </TermsCheckbox>

    <SubmitButton>
      {preset ? `Создать аккаунт и получить ${preset.name}` : 'Создать аккаунт'}
    </SubmitButton>

    <LoginLink>Уже есть аккаунт?</LoginLink>
  </SignupForm>
</SignupLayout>

SERVER ACTION signupAction:
1. Zod-валидация полей
2. Проверить уникальность email
3. Прочитать signupContext из cookie
4. Создать User с:
   - intent = signupContext.intent ?? UNKNOWN
   - referredByCode = signupContext.ref
   - utm_* = signupContext.utm_*
   - signupSource = signupContext.signupSource
   - signupIpHash, signupUserAgent
5. Сгенерировать уникальный referralCode (для MODULE16)
6. Отправить email подтверждения
7. Создать сессию
8. Редирект на /onboarding (новый маршрут, см. B2)
9. Clear signupContext cookie

ВАЛИДАЦИЯ:
- Email: стандартный regex + проверка на временные почтовые сервисы (блочный список)
- Пароль: min 8, обязательно цифра и буква (не слишком жёстко)
- Телефон: опциональный, но если введён — валидация RU/KZ/BY формата
- Спам-защита: Cloudflare Turnstile или hCaptcha
```

## B1.4. UX-детали

```
📋 МЕЛКИЕ НО ВАЖНЫЕ ДЕТАЛИ:

1. Автофокус:
   - Email-поле при загрузке
   - При ошибке — фокус на первое проблемное поле

2. Маски полей:
   - Телефон: +7 (___) ___-__-__
   - Использовать react-imask

3. Автопредложение:
   - После ввода email — если домен компании (corp.ru) → подсказка
     "Возможно вы ищете Team-тариф для компании?"

4. Социальный логин:
   - Яндекс — обязательно (большая доля в РФ)
   - Google — для международных
   - Sber ID — опционально, для корпоративных
   - Социальный логин прокидывает signupContext из cookie
     (nextauth v5 callback signIn)

5. Email-подтверждение:
   - Не блокируем вход до подтверждения
   - Но без подтверждения не даём покупать подписку (безопасность)
   - Баннер "Подтвердите email" висит до подтверждения
```

**ACCEPTANCE B1:**
- [ ] Регистрация с разных лендингов сохраняет UTM и intent
- [ ] Реферальная cookie живёт 30 дней
- [ ] Preset-плана подсвечивается на странице регистрации
- [ ] Все социальные провайдеры работают и прокидывают контекст
- [ ] E2E-тест: пришёл с `/smetchik` → preset Сметчик-Студио → после signup попадаешь на онбординг с нужным planId

---

# B2. Онбординг-мастер

## B2.0. Цель онбординга

Довести до **первой ценности** за < 5 минут:
- Подрядчик создаёт первый проект и загружает первое фото
- Заказчик создаёт первый объект и приглашает подрядчика
- Сметчик создаёт первую смету

Онбординг — **блокирующий шаг**: нельзя попасть в app до его завершения (кроме подтверждения email, которое происходит асинхронно).

## B2.1. Структура мастера

```
📋 ЗАДАЧА: Пошаговый wizard для первой настройки

📁 ФАЙЛЫ:
- src/app/(onboarding)/onboarding/layout.tsx
- src/app/(onboarding)/onboarding/page.tsx (redirect на первый шаг)
- src/app/(onboarding)/onboarding/role/page.tsx       — шаг 1
- src/app/(onboarding)/onboarding/workspace/page.tsx  — шаг 2
- src/app/(onboarding)/onboarding/plan/page.tsx       — шаг 3
- src/app/(onboarding)/onboarding/invite/page.tsx     — шаг 4 (опционально)
- src/app/(onboarding)/onboarding/first-project/page.tsx — шаг 5 (опционально)
- src/app/(onboarding)/onboarding/done/page.tsx

СТРУКТУРА LAYOUT:

<OnboardingLayout>
  <TopBar>
    <Logo />
    <ProgressIndicator current={step} total={5} />
    <SkipButton label="Пропустить" />   {/* доступен не на всех шагах */}
  </TopBar>
  <Main>
    {children}
  </Main>
</OnboardingLayout>

КАЖДЫЙ ШАГ:
- Обновляет User.onboardingStep
- Если пользователь закрыл вкладку — при возврате возобновляется с нужного шага
- После последнего шага — User.onboardingCompleted = true
```

## B2.2. Шаг 1: «Кто вы?»

```
📁 ФАЙЛ: src/app/(onboarding)/onboarding/role/page.tsx

<IntentSelector>
  {/* Если intent уже определён (пришёл со Сметчик-лендинга) —
      шаг пропускается автоматически */}

  <h2>Расскажите о себе, чтобы мы настроили Komplid под вас</h2>

  <IntentCardGrid>
    <IntentCard value="CONTRACTOR_GENERAL" icon="...">
      <Title>Генподрядчик</Title>
      <Description>Полный цикл: от сметы до сдачи в эксплуатацию</Description>
    </IntentCard>

    <IntentCard value="CONTRACTOR_INDIVIDUAL" icon="...">
      <Title>Прораб / Бригадир</Title>
      <Description>Веду журнал работ, фото, акты</Description>
    </IntentCard>

    <IntentCard value="ESTIMATOR" icon="...">
      <Title>Сметчик</Title>
      <Description>Составляю сметы быстро и профессионально</Description>
    </IntentCard>

    <IntentCard value="PTO_ENGINEER" icon="...">
      <Title>ПТО / Инженер по ИД</Title>
      <Description>Готовлю документацию к сдаче</Description>
    </IntentCard>

    <IntentCard value="CUSTOMER_PRIVATE" icon="...">
      <Title>Частный заказчик</Title>
      <Description>Строю дом или делаю ремонт, хочу контролировать</Description>
    </IntentCard>

    <IntentCard value="CONSTRUCTION_SUPERVISOR" icon="...">
      <Title>Технадзор</Title>
      <Description>Проверяю качество работ на объектах</Description>
    </IntentCard>

    <IntentCard value="UNKNOWN" icon="..." variant="muted">
      <Title>Просто смотрю</Title>
      <Description>Определюсь позже</Description>
    </IntentCard>
  </IntentCardGrid>

  <AccountTypeSelector>
    <Label>Формат работы:</Label>
    <RadioGroup>
      <Radio value="INDIVIDUAL">Физлицо</Radio>
      <Radio value="SELF_EMPLOYED">Самозанятый</Radio>
      <Radio value="ENTREPRENEUR">ИП</Radio>
      <Radio value="LEGAL_ENTITY">Юрлицо (ООО/АО)</Radio>
    </RadioGroup>
  </AccountTypeSelector>

  <SubmitButton>Продолжить</SubmitButton>
</IntentSelector>

LOGIC:
- При выборе обновляет User.intent и User.accountType
- Если intent=CUSTOMER_PRIVATE — переход сразу на ONBOARDING /customer-specific
  (упрощённый путь, без выбора B2B-тарифа)
- Иначе — на workspace/
```

## B2.3. Шаг 2: «Создадим ваше рабочее пространство»

```
📁 ФАЙЛ: src/app/(onboarding)/onboarding/workspace/page.tsx

<WorkspaceCreationForm>
  <h2>
    {intent === 'CONTRACTOR_INDIVIDUAL'
      ? 'Как называется ваша бригада?'
      : 'Как называется ваша компания?'}
  </h2>

  <FormField name="name" placeholder="ООО Стройка+" />

  <FormField name="inn" placeholder="ИНН (опционально)" />
  <HelpText>
    Укажите ИНН — мы подтянем данные из ФНС автоматически
  </HelpText>
  {/* Если ИНН введён — кнопка "Проверить", вызывает Dadata API */}

  {accountType !== 'INDIVIDUAL' && (
    <FormField name="region" label="Основной регион работы" />
  )}

  <FormField
    name="specializations"
    type="multiselect"
    label="Специализации (можно выбрать несколько)"
    options={SPECIALIZATION_OPTIONS}
    visibleIf={intent is contractor}
  />

  <SubmitButton>Создать пространство</SubmitButton>
</WorkspaceCreationForm>

API: POST /api/onboarding/create-workspace
Body: {
  name: string,
  inn?: string,
  region?: string,
  specializations: string[]
}

Логика:
1. Создать Workspace
2. Создать WorkspaceMember(userId, role=OWNER)
3. Если intent CUSTOMER_PRIVATE — skip (он работает через CustomerProject, не Workspace)
4. Обновить User.onboardingStep = 'WORKSPACE_CREATED'
5. Return { workspaceId }
```

## B2.4. Шаг 3: «Выберите тариф»

```
📁 ФАЙЛ: src/app/(onboarding)/onboarding/plan/page.tsx

<PlanSelector>
  <h2>Какой пакет подходит вам?</h2>

  {/* Подсвеченный preset — сверху, с бейджем "Рекомендуется" */}
  <RecommendedPlanCard plan={suggestedPlan} />

  <OtherPlansSection>
    <h3>Или выберите другой</h3>
    <PlanCardGrid>
      {/* Все остальные планы в зависимости от intent */}
    </PlanCardGrid>
  </OtherPlansSection>

  <FreeTrial>
    <h3>7 дней бесплатно</h3>
    <p>Без привязки карты. Полный доступ ко всем функциям.</p>
    <Button>Начать пробный период</Button>
  </FreeTrial>

  {referredByCode && (
    <ReferralBonus>
      По реферальному коду {referredByCode} вы получаете
      дополнительные 30 дней бесплатно (на общем счёте — 37 дней)
    </ReferralBonus>
  )}

  <SkipButton>Продолжить без подписки (Free)</SkipButton>
</PlanSelector>

ЛОГИКА ПОДБОРА preset:
- intent=ESTIMATOR → smetchik_studio
- intent=PTO_ENGINEER → id_master
- intent=CONTRACTOR_INDIVIDUAL → prorab_journal
- intent=CONTRACTOR_GENERAL → team
- intent=CUSTOMER_PRIVATE → customer_free (сразу Free, без paywall)
- intent=UNKNOWN → показываем все

API: POST /api/onboarding/start-trial
Body: { planCode: string }

Логика:
1. Создать Subscription(workspaceId, planId, status=TRIAL, trialEndsAt=+7d)
2. Применить реферальную скидку (если referredByCode есть)
   → продлить trial до 37 дней или применить первый платный скидкой
   (логика из MODULE16)
3. Вызвать onTrialStarted webhook (если подключены события)
4. Обновить User.onboardingStep = 'PLAN_CHOSEN'
5. Return { subscriptionId }
```

## B2.5. Шаг 4: «Пригласите команду» (опциональный)

```
📁 ФАЙЛ: src/app/(onboarding)/onboarding/invite/page.tsx

<InviteTeamForm>
  <h2>Пригласите команду (можно пропустить)</h2>

  <p>Добавьте коллег — они получат email со ссылкой</p>

  <InviteList>
    {/* Dynamic rows */}
    <InviteRow>
      <EmailField />
      <RoleSelect options={[MANAGER, ENGINEER, FOREMAN, WORKER]} />
      <RemoveButton />
    </InviteRow>
    <AddRowButton>+ Добавить ещё</AddRowButton>
  </InviteList>

  <Actions>
    <SkipButton>Пока пропущу</SkipButton>
    <SubmitButton>Отправить приглашения</SubmitButton>
  </Actions>
</InviteTeamForm>

API: POST /api/onboarding/invite-team
Body: {
  invites: [{ email, role }]
}

Логика:
1. Для каждого email:
   - Создать WorkspaceInvitation
   - Отправить email
2. Return { invitedCount }
3. Обновить User.onboardingStep = 'TEAM_INVITED'

ОГРАНИЧЕНИЯ ПО ТАРИФУ:
- Free plan: 1 приглашение (только OWNER)
- Team: до 5
- Corporate: unlimited
- Если превышение — показать paywall с апгрейдом плана
```

## B2.6. Шаг 5: «Создайте первый проект» (опциональный)

```
📁 ФАЙЛ: src/app/(onboarding)/onboarding/first-project/page.tsx

<FirstProjectForm>
  <h2>Давайте заведём первый объект</h2>

  <FormField name="name" placeholder="Дом на Ленина 10" />
  <FormField name="address" label="Адрес" />
  <FormField name="projectType" options={[APARTMENT, HOUSE, COMMERCIAL, ...]} />
  <FormField name="startDate" type="date" />
  <FormField name="plannedEndDate" type="date" optional />

  <Actions>
    <SkipButton>Создам позже</SkipButton>
    <SubmitButton>Создать проект</SubmitButton>
  </Actions>
</FirstProjectForm>

LOGIC: создаётся Project, onboardingStep = 'FIRST_PROJECT_CREATED'
```

## B2.7. Шаг завершения

```
📁 ФАЙЛ: src/app/(onboarding)/onboarding/done/page.tsx

<OnboardingDone>
  <Confetti />

  <h1>Готово! Всё настроено</h1>

  <NextStepsList>
    <Checkbox checked>Аккаунт создан</Checkbox>
    <Checkbox checked>Пространство: {workspaceName}</Checkbox>
    <Checkbox checked={hasPlan}>Тариф: {planName}</Checkbox>
    <Checkbox checked={hasInvites}>Команда приглашена</Checkbox>
    <Checkbox checked={hasProject}>Первый проект создан</Checkbox>
  </NextStepsList>

  <Tutorials>
    <h3>Рекомендуемые следующие шаги:</h3>
    <TutorialCard>
      <Title>Загрузите первое фото в проект</Title>
      <CTA>Открыть проект →</CTA>
    </TutorialCard>
    <TutorialCard>
      <Title>Импортируйте смету из Excel</Title>
    </TutorialCard>
    <TutorialCard>
      <Title>Настройте уведомления</Title>
    </TutorialCard>
  </Tutorials>

  <FinalCTA href="/app">Перейти в Komplid</FinalCTA>
</OnboardingDone>

LOGIC:
- User.onboardingCompleted = true
- Отправить welcome-email c полезными ссылками
- Подписать на продуктовую рассылку (с возможностью отписки)
- Если есть реферальный код — засчитать Referral.completedAt
  (триггер начисления награды рефереру)
```

## B2.8. Middleware: гарантия прохождения онбординга

```
📋 ЗАДАЧА: Обновить middleware.ts

📁 ФАЙЛ: src/middleware.ts

export async function middleware(req: NextRequest) {
  const session = await getSession(req);
  const { pathname } = req.nextUrl;

  // Публичные маршруты
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next();

  // Не залогинен → signin
  if (!session) return redirect('/signin');

  // Залогинен, но не прошёл онбординг
  if (!session.user.onboardingCompleted) {
    if (!pathname.startsWith('/onboarding')) {
      return redirect('/onboarding');
    }
  }

  // Онбординг пройден, но заходит на /onboarding → в app
  if (session.user.onboardingCompleted && pathname.startsWith('/onboarding')) {
    return redirect('/app');
  }

  // GUEST не пускаем в /app
  if (session.user.activeRole === 'GUEST' && pathname.startsWith('/app')) {
    return redirect('/guest');
  }

  // CUSTOMER не пускаем в /app (ведём в /moy-remont)
  if (session.user.activeRole === 'CUSTOMER' && pathname.startsWith('/app')) {
    return redirect('/moy-remont');
  }

  return NextResponse.next();
}
```

**ACCEPTANCE B2:**
- [ ] Онбординг проходится за < 5 минут без пропуска шагов
- [ ] Можно пропустить шаги 4 и 5
- [ ] При закрытии вкладки возобновление работает с правильного шага
- [ ] Preset-плана отображается корректно в зависимости от intent
- [ ] Реферальный бонус применяется правильно
- [ ] Middleware блокирует доступ в app до завершения онбординга

---

# B3. Pricing-страница и единый paywall

## B3.1. `/pricing` в приложении

```
📋 ЗАДАЧА: Создать полную pricing-страницу внутри app

📁 ФАЙЛЫ:
- src/app/(app)/pricing/page.tsx
- src/components/pricing/PricingGrid.tsx
- src/components/pricing/PlanCard.tsx
- src/components/pricing/BillingCycleToggle.tsx
- src/components/pricing/FeatureMatrix.tsx
- src/components/pricing/FaqSection.tsx

СТРУКТУРА:

<PricingPage>
  <Hero>
    <h1>Тарифы Komplid</h1>
    <BillingCycleToggle>
      Месяц / Год (со скидкой 20%)
    </BillingCycleToggle>
  </Hero>

  <TabsByAudience>
    <Tab>Для подрядчиков (B2B)</Tab>
    <Tab>Для специалистов (Профи)</Tab>
    <Tab>Для заказчиков (B2C)</Tab>
  </TabsByAudience>

  <PricingGrid tab={activeTab}>
    {tab === 'B2B' && (
      <>
        <PlanCard plan="free_b2b" />
        <PlanCard plan="team" highlighted />
        <PlanCard plan="corporate" />
      </>
    )}

    {tab === 'PROFI' && (
      <>
        <PlanCard plan="smetchik_studio" />
        <PlanCard plan="id_master" />
        <PlanCard plan="prorab_journal" />
      </>
    )}

    {tab === 'B2C' && (
      <>
        <PlanCard plan="customer_free" />
        <PlanCard plan="customer_pro" highlighted />
      </>
    )}
  </PricingGrid>

  <FeatureMatrix />
  {/* Большая таблица со всеми фичами по всем планам */}

  <FaqSection />
  {/* "Что такое Профи-пакет?", "Можно ли перейти с одного на другой?" и т.д. */}

  <CtaBlock>
    "Не нашли подходящий? Свяжитесь с нами"
  </CtaBlock>
</PricingPage>

PlanCard:
- Title (название плана)
- Price (с учётом billing cycle)
- FeatureList (первые 5-7 фичей)
- CTA: 
  - Если не авторизован → "Попробовать бесплатно" → /signup?plan=...
  - Если авторизован и нет подписки → "Выбрать" → checkout
  - Если подписка есть и это она → "Текущий план"
  - Если другая — "Перейти на этот" → upgrade/downgrade flow
```

## B3.2. Единый PaywallGate компонент

```
📋 ЗАДАЧА: Централизованный гейт для платных фич

📁 ФАЙЛЫ:
- src/components/paywall/PaywallGate.tsx
- src/components/paywall/PaywallModal.tsx
- src/lib/paywall/check.ts

КОМПОНЕНТ:

<PaywallGate
  feature={FEATURE_CODES.AI_COMPLIANCE_CHECK}
  fallback="soft"   // soft = показать оверлей, hard = вернуть 404
>
  <YourFeatureContent />
</PaywallGate>

ПОВЕДЕНИЕ:
- Проверяет текущую подписку workspace
- Если фича доступна — рендерит children
- Если нет — показывает PaywallModal с ссылкой на upgrade
- Если lim exceeded — показывает другое сообщение "Лимит исчерпан"

PaywallModal:
- Title: "Эта функция доступна на {planName}"
- Description: что даёт этот план
- Primary CTA: "Перейти на {planName} за {price} ₽/мес"
- Secondary CTA: "Пробный период 7 дней"
- Close

HOOK useFeatureAccess:
const { hasAccess, remainingQuota, plan } = useFeatureAccess(FEATURE_CODES.OCR_SCAN);

СЕРВЕРНАЯ ПРОВЕРКА:

export async function requireFeature(
  workspaceId: string,
  feature: FeatureCode
): Promise<{ remainingQuota: number | null }> {
  const subscription = await getActiveSubscription(workspaceId);
  const access = await checkFeatureAccess(subscription, feature);

  if (!access.allowed) {
    throw new PaywallError(feature, access.reason);
  }
  return { remainingQuota: access.remainingQuota };
}

Используется во всех API, где нужна проверка:
await requireFeature(workspaceId, FEATURE_CODES.AI_COMPLIANCE_CHECK);
```

## B3.3. Checkout и биллинг (интеграция с MODULE15)

```
📋 ЗАДАЧА: Стандартизировать checkout-flow

СЦЕНАРИЙ "перейти на платный план":
1. PlanCard.onClick → POST /api/billing/checkout-session
   Body: { planCode, billingCycle }
   Return: { checkoutUrl }

2. Пользователь переходит на CheckoutUrl (провайдер: ЮКасса/CloudPayments)

3. После успеха → /billing/success?sessionId=...
   Сервер верифицирует сессию через провайдера
   Создаёт/обновляет Subscription
   Применяет реферальную скидку (если есть в signupContext)
   Обновляет activeRole если был CUSTOMER_FREE → CUSTOMER_PRO

4. После провала → /billing/canceled с CTA попробовать снова

MODULE15 уже должен содержать webhook'и от провайдера — убедиться, что:
- Успешный платёж → Subscription.status = ACTIVE
- Отмена → Subscription.status = CANCELED, cancelledAt
- Неудачный платёж → CardDecliendHandler (email + баннер)
```

**ACCEPTANCE B3:**
- [ ] `/pricing` отображает все планы с правильными ценами
- [ ] Tabs переключают аудитории
- [ ] BillingCycleToggle меняет цены на годовые
- [ ] FeatureMatrix показывает полную матрицу
- [ ] `<PaywallGate>` работает во всех местах, где используются платные фичи
- [ ] `requireFeature()` вызывается во всех API, где нужен gate
- [ ] Checkout-flow завершается успешным обновлением Subscription

---

# ФАЗА C — УПРАВЛЕНИЕ РОЛЯМИ ВНУТРИ ПРОЕКТА (1.5 недели)

# C1. Управление членами workspace (UI)

## C1.0. Контекст

Сейчас, по итогам аудита, управление членами либо отсутствует, либо разбросано. Нужно собрать всё в одно место: `/workspace/members`.

## C1.1. Страница `/workspace/members`

```
📋 ЗАДАЧА: Полноценный UI для управления командой

📁 ФАЙЛЫ:
- src/app/(app)/workspace/members/page.tsx
- src/app/(app)/workspace/members/invitations/page.tsx
- src/components/workspace/MembersTable.tsx
- src/components/workspace/InviteMemberModal.tsx
- src/components/workspace/ChangeRoleModal.tsx
- src/components/workspace/RemoveMemberModal.tsx
- src/components/workspace/ResendInvitationButton.tsx

СТРУКТУРА СТРАНИЦЫ:

<MembersPage>
  <Header>
    <Breadcrumbs>Пространство › Члены команды</Breadcrumbs>
    <Actions>
      <InviteMemberButton>+ Пригласить</InviteMemberButton>
      <ViewInvitationsButton>
        Приглашения ({pendingCount})
      </ViewInvitationsButton>
    </Actions>
  </Header>

  <QuotaIndicator>
    {/* "Используется 3 из 5 мест" — визуально */}
    {used >= total && (
      <UpgradeBanner>
        Превышен лимит членов.
        <CTA>Перейти на план выше →</CTA>
      </UpgradeBanner>
    )}
  </QuotaIndicator>

  <Filters>
    <SearchInput placeholder="Поиск по имени или email" />
    <RoleFilter />
    <StatusFilter />
  </Filters>

  <MembersTable>
    <columns>
      — Аватар + ФИО + email
      — Роль (с бейджем)
      — Специализация
      — Статус (ACTIVE / SUSPENDED / ...)
      — Последняя активность
      — Actions: [...] меню
    </columns>
  </MembersTable>

  <BulkActions if="selection.length > 0">
    — Изменить роль для выбранных
    — Деактивировать выбранных
    — Экспорт в CSV
  </BulkActions>
</MembersPage>

ACTIONS MENU (для каждого члена):
- Изменить роль
- Изменить специализацию / должность
- Приостановить (SUSPEND) — временное отключение без удаления
- Удалить из workspace
- Просмотреть активность (audit log)
- Сбросить пароль (только для OWNER)
```

## C1.2. Приглашение новых членов

```
📁 ФАЙЛ: src/components/workspace/InviteMemberModal.tsx

<InviteMemberModal>
  <Tabs>
    <Tab>Обычный член команды</Tab>
    <Tab>Гость / Заказчик</Tab>
  </Tabs>

  {activeTab === 'team' && (
    <TeamInviteForm>
      <EmailField required />
      <FullNameField />
      <RoleSelect options={[ADMIN, MANAGER, ENGINEER, FOREMAN, WORKER]} />
      <SpecializationField options={SPECIALIZATIONS} />
      <ProjectsField>
        {/* Выбор проектов, к которым член будет иметь доступ */}
        {/* Появляется после Фазы C2 */}
      </ProjectsField>
      <PersonalMessageField optional />
      <SubmitButton>Отправить приглашение</SubmitButton>
    </TeamInviteForm>
  )}

  {activeTab === 'guest' && (
    <GuestInviteForm>
      {/* Это уже Фаза 2 MODULE17 — но UI тот же, перенаправляет
          в /api/workspaces/[id]/guests/invitations */}
      <FullNameField required />
      <EmailOrPhoneFields />
      <ScopeBuilder>
        {/* Визуальный билдер guestScope */}
        {/* Выбор проектов, разрешений: canViewCosts, canSignActs, ... */}
      </ScopeBuilder>
      <SignatureMethodSelect options={[SMS, EMAIL_CONFIRM, SIMPLE_ECP]} />
      <ExpiryField />
      <SubmitButton>Пригласить гостя</SubmitButton>
    </GuestInviteForm>
  )}
</InviteMemberModal>

API:
- POST /api/workspaces/[id]/members/invitations (обычные)
- POST /api/workspaces/[id]/guests/invitations (гости; работает с MODULE17)

ПРОВЕРКИ:
1. requirePermission(WORKSPACE_MANAGE_MEMBERS)
2. requireFeature проверяет лимит членов по тарифу
3. Duplicate check: нельзя пригласить уже приглашённого (ACTIVE или PENDING)
4. Если тот же email уже есть как GUEST в других workspaces — это нормально
   (один User может быть в разных workspaces с разными ролями)
```

## C1.3. Изменение роли существующего члена

```
📁 ФАЙЛ: src/components/workspace/ChangeRoleModal.tsx

<ChangeRoleModal member={member}>
  <CurrentRoleBadge role={member.role} />

  <RoleSelect>
    {/* Выпадающий список с пояснениями:
        "Администратор — полный доступ кроме биллинга"
        "Менеджер — управляет проектами, назначает исполнителей"
        и т.д. */}
  </RoleSelect>

  <WarningsIfRoleDowngrade>
    {/* Если понижаем ADMIN → WORKER:
        "Этот член потеряет доступ к следующим действиям: ..." */}
  </WarningsIfRoleDowngrade>

  <SpecializationField />

  <SubmitButton>Применить</SubmitButton>
</ChangeRoleModal>

API: PATCH /api/workspaces/[id]/members/[memberId]
Body: { role?, specialization?, title? }

ПРОВЕРКИ:
- requirePermission(WORKSPACE_MANAGE_MEMBERS)
- Нельзя менять роль самому себе
- Нельзя снимать OWNER-а если он единственный (всегда должен быть минимум 1 OWNER)
- При понижении роли — audit-лог
```

## C1.4. Приостановка и удаление

```
📋 ЗАДАЧА: SUSPENDED и DEACTIVATED — разные сценарии

SUSPENDED (временно):
- Например, сотрудник в отпуске
- Не платим за его место в тарифе (считается деактивированным для биллинга)
- Не видит приложение, но данные его действий остаются
- Можно вернуть в ACTIVE одной кнопкой

DEACTIVATED (удалён из workspace):
- Членство разорвано
- Но его созданные документы/фото/комментарии — остаются в БД
  (с пометкой "пользователь больше не в команде")
- Email сохраняется для восстановления в случае ошибки

GDPR:
- По запросу "удалить мои данные" — мы НЕ удаляем записи, но
  анонимизируем их (user.fullName = "Пользователь #123")
- Для этого в User должен быть флаг anonymizedAt

КОМПОНЕНТ:
<RemoveMemberModal member={member}>
  <RadioGroup>
    <Radio value="SUSPEND">
      Приостановить (можно будет вернуть)
    </Radio>
    <Radio value="DEACTIVATE">
      Удалить из команды (данные останутся)
    </Radio>
  </RadioGroup>

  <ReasonField optional />
  <TransferOwnershipSelect if="member.role === OWNER">
    {/* Выбор нового OWNER-а — ОБЯЗАТЕЛЬНО если удаляется последний */}
  </TransferOwnershipSelect>

  <SubmitButton variant="destructive">Подтвердить</SubmitButton>
</RemoveMemberModal>
```

**ACCEPTANCE C1:**
- [ ] OWNER может видеть всех членов и их роли
- [ ] Приглашение обычного члена и гостя работают через одно модалное окно
- [ ] Лимит по тарифу проверяется перед созданием приглашения
- [ ] Изменение роли не ломает целостность (минимум 1 OWNER)
- [ ] SUSPENDED/DEACTIVATED работают корректно, UX различается
- [ ] Передача OWNER-а работает атомарно (транзакция)

---

# C2. ProjectMember — роли в проекте

## C2.0. Контекст и обоснование

**Проблема:** Сейчас роли только на уровне Workspace. Бригадир компании "Стройка+" имеет доступ ко всем 20 проектам. Но он работает только на 3 объектах.

**Решение:** Ввести `ProjectMember` — членство на уровне проекта с уточнением роли/прав.

**Правило:** `ProjectMember` уточняет, но не расширяет права `WorkspaceMember`. Если у тебя на workspace `WORKER`, то даже если ты `ProjectMember` с ролью `MANAGER` — ты не сможешь делать то, что `WORKER` не может делать на уровне workspace.

Исключение: GUEST / CUSTOMER работают только через ProjectMember (у них scope уже в guestScope).

## C2.1. Изменения в Prisma-схеме

```
📁 ФАЙЛ: prisma/schema.prisma

model ProjectMember {
  id              String   @id @default(cuid())
  projectId       String
  project         Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  workspaceMemberId String
  workspaceMember WorkspaceMember @relation(fields: [workspaceMemberId], references: [id], onDelete: Cascade)
  projectRole     ProjectRole
  assignedAt      DateTime @default(now())
  assignedBy      String
  notes           String?

  @@unique([projectId, workspaceMemberId])
  @@index([projectId])
  @@index([workspaceMemberId])
}

enum ProjectRole {
  PROJECT_OWNER       // руководитель проекта (не путать с OWNER workspace)
  PROJECT_MANAGER     // РП
  SITE_FOREMAN        // прораб на объекте
  SPECIALIST          // сметчик/ПТО, закреплённый за проектом
  WORKER              // исполнитель работ
  OBSERVER            // только чтение
}

ШАГ 2. Расширить Project:

model Project {
  // ... существующие поля
  memberPolicy    ProjectMemberPolicy @default(WORKSPACE_WIDE)
  // WORKSPACE_WIDE = видят все члены workspace
  // ASSIGNED_ONLY  = только те, кто в ProjectMember

  members         ProjectMember[]
}

enum ProjectMemberPolicy {
  WORKSPACE_WIDE
  ASSIGNED_ONLY
}

КОМАНДА:
npx prisma migrate dev --name project_members

BACKFILL-СКРИПТ scripts/backfill-project-members.ts:
- Все существующие проекты → memberPolicy = WORKSPACE_WIDE
- Не добавляем ProjectMember записи автоматически
  (это не требуется для WORKSPACE_WIDE)
```

## C2.2. Обновление проверки прав

```
📋 ЗАДАЧА: Учитывать ProjectMember в requirePermission

📁 ФАЙЛЫ:
- src/lib/permissions/check.ts (обновить)

НОВАЯ ЛОГИКА:

export async function requireProjectAccess(
  userId: string,
  projectId: string,
  action: Action
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { workspace: true }
  });
  if (!project) throw new NotFoundError();

  // Проверка 1: член workspace?
  const workspaceMember = await requirePermission(
    userId, project.workspaceId, action
  );

  // Проверка 2: если проект с ASSIGNED_ONLY — проверяем ProjectMember
  if (project.memberPolicy === 'ASSIGNED_ONLY') {
    // OWNER/ADMIN workspace — всегда имеют доступ
    if (['OWNER', 'ADMIN'].includes(workspaceMember.role)) {
      return { workspaceMember, projectMember: null };
    }

    const projectMember = await prisma.projectMember.findUnique({
      where: {
        projectId_workspaceMemberId: {
          projectId,
          workspaceMemberId: workspaceMember.id
        }
      }
    });
    if (!projectMember) {
      throw new ForbiddenError('Not assigned to this project');
    }

    return { workspaceMember, projectMember };
  }

  return { workspaceMember, projectMember: null };
}

ПЕРЕХОД существующих API:
- Везде где было requirePermission(userId, workspaceId, ...) на уровне проекта
  → заменить на requireProjectAccess(userId, projectId, ...)
- Для workspace-уровня (например, управление членами) — оставить requirePermission
```

## C2.3. UI на странице проекта

```
📋 ЗАДАЧА: Вкладка "Команда проекта"

📁 ФАЙЛЫ:
- src/app/(app)/projects/[id]/team/page.tsx
- src/components/project/ProjectTeamTab.tsx
- src/components/project/AssignMemberModal.tsx
- src/components/project/ProjectPolicySelector.tsx

<ProjectTeamTab>
  <PolicySelector>
    <RadioGroup value={project.memberPolicy}>
      <Radio value="WORKSPACE_WIDE">
        Все члены команды имеют доступ
      </Radio>
      <Radio value="ASSIGNED_ONLY">
        Только назначенные ниже
      </Radio>
    </RadioGroup>
  </PolicySelector>

  {project.memberPolicy === 'ASSIGNED_ONLY' && (
    <>
      <AssignMemberButton>+ Назначить члена</AssignMemberButton>
      <AssignedMembersTable>
        <columns>
          — Аватар + ФИО
          — WS-роль (бейдж серый)
          — Роль в проекте (редактируемая)
          — Дата назначения
          — Actions (снять с проекта)
        </columns>
      </AssignedMembersTable>
    </>
  )}

  {project.memberPolicy === 'WORKSPACE_WIDE' && (
    <AllWorkspaceMembersList>
      {/* Информационный блок: "Сейчас доступ имеют все N членов" */}
      {/* Ссылка: "Управлять членами команды → /workspace/members" */}
    </AllWorkspaceMembersList>
  )}
</ProjectTeamTab>

API:
- PATCH /api/projects/[id]  — обновить memberPolicy
- POST /api/projects/[id]/members — назначить
- DELETE /api/projects/[id]/members/[memberId] — снять
- PATCH /api/projects/[id]/members/[memberId] — сменить projectRole
```

## C2.4. Фильтрация в списке проектов

```
📋 ЗАДАЧА: На странице /app/projects — показывать только доступные

LOGIC:
Для пользователя user с членством в workspace W:
- Если user.role IN (OWNER, ADMIN) → все проекты W
- Иначе:
  - Проекты с policy = WORKSPACE_WIDE
  - ПЛЮС проекты где user есть в ProjectMember

Prisma query:
const projects = await prisma.project.findMany({
  where: {
    workspaceId: wsId,
    OR: (['OWNER', 'ADMIN'].includes(member.role))
      ? undefined  // нет фильтра = все
      : [
          { memberPolicy: 'WORKSPACE_WIDE' },
          { members: { some: { workspaceMemberId: member.id }}}
        ]
  }
});
```

**ACCEPTANCE C2:**
- [ ] Миграция применена, существующие проекты имеют WORKSPACE_WIDE
- [ ] OWNER/ADMIN видят все проекты независимо от policy
- [ ] Назначение члена на проект работает
- [ ] WORKER, не назначенный на проект ASSIGNED_ONLY, получает 403
- [ ] Список проектов /app/projects фильтруется корректно
- [ ] API-эндпоинты проекта используют requireProjectAccess

---

# C3. Workspace-switcher и личный профиль

## C3.1. Проблема нескольких workspace

Пользователь может состоять в нескольких workspaces одновременно:
- Как OWNER своего ИП
- Как GUEST у нанявшей компании
- Как CUSTOMER своего ремонта

Нужен явный переключатель.

## C3.2. Компонент WorkspaceSwitcher

```
📁 ФАЙЛЫ:
- src/components/layout/WorkspaceSwitcher.tsx
- src/app/api/user/active-workspace/route.ts (POST — переключить)

<WorkspaceSwitcher>
  <Trigger>
    <Avatar />
    <Name>{currentWorkspace.name}</Name>
    <RoleBadge>{currentRole}</RoleBadge>
    <ChevronDown />
  </Trigger>

  <DropdownMenu>
    <Section title="Компании где вы работаете">
      {memberships
        .filter(m => ['OWNER', 'ADMIN', 'MANAGER', 'ENGINEER', 'FOREMAN', 'WORKER'].includes(m.role))
        .map(m => (
          <WorkspaceItem key={m.id} onClick={() => switchTo(m.workspaceId)}>
            <Avatar />
            <Name>{m.workspace.name}</Name>
            <RoleBadge>{m.role}</RoleBadge>
            {m.id === activeMembershipId && <CheckIcon />}
          </WorkspaceItem>
        ))}
    </Section>

    <Section title="Вы гость">
      {memberships.filter(m => m.role === 'GUEST').map(...)}
    </Section>

    <Section title="Ваши ремонты">
      {memberships.filter(m => m.role === 'CUSTOMER').map(...)}
    </Section>

    <Separator />

    <MenuItem href="/workspace/new">+ Создать новую компанию</MenuItem>
    <MenuItem href="/profile">Настройки профиля</MenuItem>
    <MenuItem onClick={signout}>Выйти</MenuItem>
  </DropdownMenu>
</WorkspaceSwitcher>

API POST /api/user/active-workspace:
Body: { workspaceId: string }
- Проверяет что пользователь — член этого workspace
- Обновляет User.activeWorkspaceId
- В session callback при следующем refresh — session.user.activeWorkspaceId
  обновится
- Redirect на /app, /guest или /moy-remont в зависимости от роли
```

## C3.3. Создание дополнительного workspace

```
📋 ЗАДАЧА: Пользователь, уже имеющий workspace, может создать ещё один

📁 ФАЙЛ: src/app/(app)/workspace/new/page.tsx

— Тот же мастер, что в онбординге (B2.3), но внутри app
— После создания — автоматически переключается на новый workspace
— Ограничения по тарифу: на Free — 1 workspace, на Pro — 3, на Team/Corp — unlimited
```

## C3.4. Страница профиля пользователя

```
📋 ЗАДАЧА: Личный профиль (не workspace — профиль User)

📁 ФАЙЛЫ:
- src/app/(app)/profile/page.tsx
- src/app/(app)/profile/security/page.tsx
- src/app/(app)/profile/notifications/page.tsx
- src/app/(app)/profile/integrations/page.tsx
- src/app/(app)/profile/referrals/page.tsx (связь с MODULE16)
- src/app/(app)/profile/delete/page.tsx

ВКЛАДКИ:

1. Общая информация
   — Avatar upload
   — ФИО
   — Email (с подтверждением смены)
   — Телефон (с подтверждением смены через SMS)
   — Интересы/специализация (intent)
   — Язык интерфейса (ru/en)
   — Часовой пояс

2. Безопасность
   — Пароль (смена)
   — 2FA (включение/отключение)
   — Сессии на других устройствах (список + завершение)
   — Связанные социальные аккаунты (Яндекс, Google, ...)

3. Уведомления
   — Email-рассылки (продукт / дайджест / обновления)
   — Push (если PWA)
   — Telegram (привязка через linkCode)
   — Выключатель "Не беспокоить" + часы тишины

4. Интеграции
   — Привязка Яндекс.Диск / Google Drive (для экспорта)
   — Привязка ЭЦП (для подписи документов)
   — API-токены (для Corporate, генерация и управление)

5. Реферальная программа (MODULE16)
   — Ваш реферальный код + ссылка
   — Статистика: сколько приглашено, сколько заработано
   — Список приглашённых
   — Выплаты / списание

6. Удалить аккаунт
   — Экспорт данных (в JSON)
   — Окончательное удаление с анонимизацией
   — Нельзя удалить если единственный OWNER в workspace (надо сначала передать)
```

**ACCEPTANCE C3:**
- [ ] Переключение между workspace работает мгновенно (без перезагрузки)
- [ ] Роль в header меняется в зависимости от активного workspace
- [ ] Создание нового workspace работает, лимит по тарифу проверяется
- [ ] Профиль User имеет все 6 вкладок и работает
- [ ] Удаление аккаунта блокируется если пользователь единственный OWNER

---

# ФАЗА D — SECURITY И FEATURE-INFRASTRUCTURE

# D1. Feature-flags / PaywallGate компонент

(Уже описан в B3.2. В этой фазе — дополнения: runtime-flags для экспериментов.)

## D1.1. Runtime feature-flags

```
📋 ЗАДАЧА: Различать платёжные (paywall) и runtime (experiment) флаги

РАЗНИЦА:
- PaywallGate — связан с подпиской, проверяется по SubscriptionFeature
- FeatureFlag — A/B-тесты, постепенный rollout, kill-switch

📁 ФАЙЛЫ:
- src/lib/feature-flags/flags.ts
- src/lib/feature-flags/evaluate.ts
- prisma/schema.prisma — модель FeatureFlag (новая)

МОДЕЛЬ Prisma:

model FeatureFlag {
  id            String   @id @default(cuid())
  key           String   @unique
  description   String?
  enabled       Boolean  @default(false)
  rolloutPercent Int     @default(0)  // 0-100
  audiences     Json?    // { workspaceIds: [], roles: [], intents: [] }
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

КОМАНДА:
npx prisma migrate dev --name feature_flags

ХУК:
const { enabled } = useFeatureFlag('new_ai_compliance_ui');
if (enabled) return <NewUI />;
return <OldUI />;

СЕРВЕРНАЯ ПРОВЕРКА:
if (await isFeatureFlagEnabled('new_ai_compliance_ui', { userId, workspaceId })) {
  // ...
}

ЛОГИКА EVALUATE:
1. Получаем FeatureFlag из БД (с кешом через Redis/in-memory)
2. Если enabled=false — return false
3. Проверяем audiences: если workspaceId в списке — return true
4. Иначе — hash(userId + flag.key) % 100 < rolloutPercent → true
5. Логируем событие в analytics (опционально)

ADMIN UI:
/admin/feature-flags — список флагов, включение/rollout slider
Только для super-admin пользователей
```

## D1.2. Интеграция PaywallGate и FeatureFlag

```
📋 ЗАДАЧА: Универсальный гейт

<Gate
  feature={FEATURE_CODES.AI_COMPLIANCE_CHECK}    // paywall
  flag="new_ai_compliance_ui"                    // experiment
>
  <NewUI />
</Gate>

Логика:
1. Проверяем paywall (feature) — если нет доступа, показываем paywall-модал
2. Проверяем flag — если выключен, либо показываем старое UI, либо скрываем
3. Если оба ОК — показываем children

ИЛИ через отдельные компоненты:
<PaywallGate feature={FEATURE_CODES.AI_COMPLIANCE_CHECK}>
  <FeatureFlagGate flag="new_ai_compliance_ui" fallback={<OldUI />}>
    <NewUI />
  </FeatureFlagGate>
</PaywallGate>
```

**ACCEPTANCE D1:**
- [ ] Feature-flags работают в UI и на сервере
- [ ] Admin-панель позволяет управлять флагами
- [ ] A/B-тесты можно запускать через аудитории
- [ ] Kill-switch позволяет мгновенно отключить функцию

---

# D2. Audit log и security

## D2.1. Модель AuditLog

```
📁 ФАЙЛ: prisma/schema.prisma

model AuditLog {
  id            String   @id @default(cuid())
  workspaceId   String?
  workspace     Workspace? @relation(fields: [workspaceId], references: [id], onDelete: SetNull)
  actorUserId   String?
  actor         User?    @relation(fields: [actorUserId], references: [id], onDelete: SetNull)
  action        String   // "member.invited", "member.role_changed", ...
  resourceType  String?  // "User", "Workspace", "Project", "Subscription"
  resourceId    String?
  before        Json?
  after         Json?
  ipAddress     String?
  userAgent     String?
  createdAt     DateTime @default(now())

  @@index([workspaceId, createdAt])
  @@index([actorUserId, createdAt])
  @@index([action, createdAt])
}

КОМАНДА:
npx prisma migrate dev --name audit_log

ХЕЛПЕР src/lib/audit/log.ts:

export async function logAudit(params: {
  action: string;
  actorUserId?: string;
  workspaceId?: string;
  resourceType?: string;
  resourceId?: string;
  before?: any;
  after?: any;
  request?: NextRequest;
}) {
  await prisma.auditLog.create({
    data: {
      action: params.action,
      actorUserId: params.actorUserId,
      workspaceId: params.workspaceId,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      before: params.before,
      after: params.after,
      ipAddress: params.request?.headers.get('x-forwarded-for'),
      userAgent: params.request?.headers.get('user-agent'),
    }
  });
}

ОБЯЗАТЕЛЬНЫЕ СОБЫТИЯ ДЛЯ ЛОГИРОВАНИЯ:

Auth:
- auth.signup, auth.signin, auth.signout, auth.password_changed
- auth.2fa_enabled, auth.2fa_disabled
- auth.session_revoked

Workspace:
- workspace.created, workspace.updated, workspace.deleted
- workspace.transferred_ownership

Members:
- member.invited, member.joined, member.role_changed
- member.suspended, member.reactivated, member.removed

Subscription:
- subscription.created, subscription.upgraded, subscription.downgraded
- subscription.cancelled, subscription.payment_failed

Projects:
- project.created, project.published_dashboard, project.revoked_publicity
- project.member_added, project.member_removed

Documents:
- document.signed, document.rejected
- document.deleted (особенно важно)

Sensitive:
- api_token.created, api_token.revoked
- guest.invited, guest.accepted, guest.signed_act
```

## D2.2. UI просмотра аудит-логов

```
📁 ФАЙЛЫ:
- src/app/(app)/workspace/audit-log/page.tsx
- src/components/audit/AuditLogTable.tsx
- src/components/audit/AuditLogFilters.tsx

<AuditLogPage>
  <Filters>
    — Период (date range picker)
    — Действие (multi-select)
    — Член команды (search)
    — Ресурс (type + search по id)
  </Filters>

  <AuditLogTable>
    <columns>
      — Дата/время
      — Кто (аватар + имя)
      — Действие (человекочитаемое)
      — Ресурс (ссылка если уместно)
      — IP / User-Agent (раскрывается при клике)
      — Детали (diff before/after) — раскрывается
    </columns>
    <pagination />
  </AuditLogTable>

  <ExportButton>Экспорт в CSV</ExportButton>
</AuditLogPage>

ДОСТУП:
- OWNER — все события workspace
- ADMIN — всё кроме billing
- Остальные — 403

ХРАНЕНИЕ:
- Все события за последние 12 месяцев в горячей БД
- Старше — архивируется (S3 + retention policy)
```

## D2.3. Security checklist

```
📋 ОБЯЗАТЕЛЬНЫЕ ЧЕКИ перед релизом:

Auth:
[ ] Rate limit на /api/auth/* (5 попыток/мин/IP)
[ ] Ограничение на forgot-password (3 запроса/час/email)
[ ] 2FA обязательно для OWNER (через 7 дней после создания — soft enforcement)
[ ] Все сессии JWT с коротким TTL (15 мин access + 7 дней refresh)
[ ] Cookie: HttpOnly, Secure, SameSite=Lax
[ ] CSRF-токены для всех state-changing actions

Password policy:
[ ] Min 8 символов, не общий пароль (из Have I Been Pwned API)
[ ] Hash через bcrypt (cost 12) или Argon2id

Session security:
[ ] Invalidate всех сессий при смене пароля
[ ] Invalidate сессии при изменении role
[ ] "Сессии на других устройствах" с возможностью выйти

Rate limits (по умолчанию):
[ ] /api/auth/* — 10 req/min/IP
[ ] /api/onboarding/* — 30 req/min/user
[ ] /api/workspaces/.../invitations — 10 req/min/workspace
[ ] /api/public/* — 60 req/min/IP
[ ] /api/customer/ai-lawyer (из MODULE17) — 20/день/user на Pro

Input validation:
[ ] Все API — Zod
[ ] Все форм — react-hook-form + Zod resolver
[ ] SQL-injection защита через Prisma parametrized queries
[ ] XSS — React escapes по умолчанию, НЕ используем dangerouslySetInnerHTML без sanitize

OWASP Top 10 check:
[ ] A01 Broken Access Control → permissions matrix
[ ] A02 Cryptographic Failures → TLS, bcrypt
[ ] A03 Injection → Zod + Prisma
[ ] A04 Insecure Design → ревью этого плана
[ ] A05 Security Misconfiguration → env check script
[ ] A06 Vulnerable Components → npm audit в CI
[ ] A07 Identification/Auth Failures → чек-лист Auth выше
[ ] A08 Software and Data Integrity → подписанные коммиты, SRI для CDN
[ ] A09 Security Logging → AuditLog
[ ] A10 SSRF → allow-list для внешних URL (fetch)
```

**ACCEPTANCE D2:**
- [ ] AuditLog фиксирует все события из списка
- [ ] UI просмотра работает и фильтрует
- [ ] Security checklist пройден, документация обновлена
- [ ] Pen-test (ручной или через OWASP ZAP) проведён, критичных уязвимостей нет

---

# ОБЩИЕ РАЗДЕЛЫ

## Порядок внедрения (последовательная дорожная карта)

### Недели 1-2 — Фаза A (фундамент)

| Неделя | Задачи                                                |
|--------|-------------------------------------------------------|
| 1      | A1 аудит + унификация + FEATURE_CODES                 |
| 1-2    | A2 миграции Prisma + seed фичей/планов                |
| 2      | A3 permissions matrix + миграция всех API             |

### Недели 3-4 — Фаза B (регистрация и онбординг)

| Неделя | Задачи                                                |
|--------|-------------------------------------------------------|
| 3      | B1 новая форма регистрации + signupContext + социалки |
| 3-4    | B2 онбординг-мастер (5 шагов)                         |
| 4      | B3 pricing-страница + PaywallGate                     |

### Недели 5-6 — Фаза C + D

| Неделя | Задачи                                                |
|--------|-------------------------------------------------------|
| 5      | C1 members UI + invitations                            |
| 5      | C2 ProjectMember + миграция проектов                   |
| 6      | C3 workspace-switcher + профиль User                   |
| 6      | D1 feature-flags + D2 audit log + security checklist   |

---

## ENV-переменные (добавить к существующим)

```bash
# Authorization
NEXTAUTH_URL=https://app.komplid.ru
NEXTAUTH_SECRET=          # openssl rand -base64 32
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# Social providers (если ещё не настроены)
YANDEX_CLIENT_ID=
YANDEX_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
VK_CLIENT_ID=
VK_CLIENT_SECRET=

# Spam protection
CLOUDFLARE_TURNSTILE_SITE_KEY=
CLOUDFLARE_TURNSTILE_SECRET_KEY=

# SMS (для 2FA и подтверждения телефона) — тот же, что в MODULE17 Фаза 2
SMS_PROVIDER=smsru
SMS_API_KEY=

# Feature flags
FEATURE_FLAG_CACHE_TTL_SECONDS=60

# Dadata для проверки ИНН в онбординге
DADATA_API_KEY=
DADATA_SECRET=

# Password breach check
HIBP_CHECK_ENABLED=true

# Audit log retention
AUDIT_LOG_HOT_RETENTION_DAYS=365
AUDIT_LOG_ARCHIVE_S3_BUCKET=komplid-audit-archive
```

---

## Критерии готовности всего модуля

### Бизнес-метрики:

- [ ] Conversion signup → first project created: > 60%
- [ ] Drop-off на каждом шаге онбординга: < 15%
- [ ] Median time to first value (регистрация → первое значимое действие): < 10 мин
- [ ] Conversion trial → paid: > 20% (3 месяца после запуска)
- [ ] Правильная атрибуция источника для каждого signup (UTM/ref/direct)
- [ ] Reactivation rate после 7-дневного trial: > 30%

### Технические метрики:

- [ ] Lighthouse > 90 на /signup, /signin, /onboarding/*
- [ ] P95 ответа /api/auth/session: < 100 мс
- [ ] Unit test coverage src/lib/permissions/: > 95%
- [ ] E2E-тесты покрывают 100% критичных сценариев регистрации
- [ ] Zero accessibility issues (axe-core) на auth/onboarding страницах

---

## Связь с другими планами

| План                       | Что связано                                         |
|----------------------------|-----------------------------------------------------|
| SUBSCRIPTION_SYSTEM        | PaywallGate, requireFeature, SubscriptionFeature    |
| MODULE15 (Профи-пакеты)    | Pricing tabs, plan cards, checkout-flow             |
| MODULE16 (Рефералы)        | /ref/[code], signupContext, Referral.completedAt    |
| MODULE_MARKETING           | UTM-параметры, лендинги с preset plan/intent        |
| MODULE17 Фаза 1 (дашборды) | requirePermission(PROJECT_PUBLISH_DASHBOARD)        |
| MODULE17 Фаза 2 (гости)    | GUEST роль + guestScope + invitation flow           |
| MODULE17 Фаза 3 (Мой Ремонт) | CUSTOMER роль + middleware-редирект → /moy-remont |
| MODULE17 KF-1 (AI-проверка) | PaywallGate(AI_COMPLIANCE_CHECK)                   |
| MODULE17 KF-3 (OCR)        | PaywallGate(OCR_SCAN)                               |
| MODULE17 KF-4 (Маркетплейс) | ProjectMember scopes, requireFeature(MARKETPLACE)  |

---

## Риски и митигации

| Риск                                       | Митигация                                            |
|--------------------------------------------|------------------------------------------------------|
| Миграция ломает существующих пользователей | Backfill-скрипты + обязательное прогонка на staging  |
| Падение conversion signup после редизайна  | A/B-тест новой формы против старой 30 дней           |
| Онбординг воспринимается как препятствие   | Все шаги кроме 1-3 — пропускаемые                    |
| Permissions-матрица с багами → доступ      | Unit-тесты на каждую комбинацию + pen-test           |
| Social provider (Яндекс) падает            | Email-fallback всегда доступен                       |
| Реферальные коды неправильно атрибутируют  | Cookie TTL 30 дней + server-side финальная проверка  |
| Переход workspace теряет состояние UI      | Активный workspace в session, переключение = logout+in |

---

## Чек-лист прежде чем отдавать в Claude Code

- [ ] MODULE15 (подписки) и MODULE16 (рефералы) смержены
- [ ] MODULE_MARKETING имеет стабильные UTM-ссылки на app
- [ ] Staging-окружение с отдельной БД готово
- [ ] Backups текущей prod-БД сделаны
- [ ] Social-providers зарегистрированы (Яндекс ID, Google OAuth)
- [ ] Dadata API-ключ получен
- [ ] Cloudflare Turnstile подключен
- [ ] SMS-провайдер интегрирован (или готов к интеграции)

---

## FINAL — команда запуска реализации

Порядок отдачи в Claude Code (строго последовательный):

```
A1 (аудит, FEATURE_CODES) → PR → merge → staging
  ↓
A2 (Prisma миграции) → PR → merge → staging (запустить backfill)
  ↓
A3 (permissions matrix) → PR → merge → staging (все E2E-тесты проходят)
  ↓
B1 (новая signup) → PR → merge → staging (A/B-эксперимент)
  ↓
B2 (онбординг) → PR → merge → staging
  ↓
B3 (pricing + PaywallGate) → PR → merge → staging
  ↓
C1 (members UI) → PR → merge
  ↓
C2 (ProjectMember) → PR → merge (с backfill)
  ↓
C3 (switcher + profile) → PR → merge
  ↓
D1 (feature-flags) + D2 (audit) → два параллельных PR
  ↓
Финальный QA и релиз в prod
```

**Правило работы с Claude Code (то же, что в MODULE17):**

```
1 раздел → 1 feature branch → 1 PR → code review → merge → staging-test → переход к следующему
```

Важно: Фаза A должна быть полностью реализована и проверена ДО старта Фазы B. Иначе любые изменения в permissions после запуска онбординга вызовут каскад проблем.

---

## После завершения AUTH_ONBOARDING_ROLES_PLAN

Система готова к старту MODULE17_PLAN:
- Роли GUEST и CUSTOMER уже определены — не нужна отдельная миграция
- PaywallGate готов — все killer-фичи сразу обвёрнуты
- Audit log фиксирует подписания гостями и другие события
- Permissions matrix централизована — добавление Фазы 2 GUEST и Фазы 3 CUSTOMER
  требует только обновления матрицы в одном месте

Можно стартовать MODULE17 Фазу 1 (публичные дашборды) в следующий же спринт.

---

_Документ готов к передаче в Claude Code._
_Рекомендуемый порядок: A1 → A2 → A3 → B1 → B2 → B3 → C1 → C2 → C3 → D1+D2._
_Общая длительность: 4-6 недель при одном разработчике, 3-4 недели при двух._

