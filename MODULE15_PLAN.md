# Модуль 15 — Монетизация, B2C Профи-пакеты и рост

> **Версия:** v2 (модернизированная — апрель 2026)
> **Статус:** ⬜ Не начато
> **Ориентир:** 14 недель (7 фаз)
> **Зависимости:** Модули 6 ✅, 9 ✅, 10 ✅, 11 ✅, 16 🔄 (PWA)

---

## 0. Обзор модуля

Модуль 15 — это **двухтрековая монетизация** StroyDocs:

**B2B-трек (Team / Corporate):** сохранён без изменений — для организаций, по 10–50+ пользователей. Идёт из действующего роадмапа.

**B2C-трек (Профи-пакеты):** новый — для одиночных профессионалов. **3 пакета Фазы 1** с единой ценовой политикой **1 900 ₽ (Базовый) / 2 900 ₽ (Pro)**:

| Пакет | Роль | 3 ключевых модуля | Цена (м/г) |
|-------|------|-------------------|------------|
| **Сметчик-Студио** | Сметчик / ПЭО | 6 (Сметы), 4 (Контракты-lite), 19 (Шаблоны+Нормативка) | 1 900 / 2 900 ₽·мес |
| **ИД-Мастер** | ПТО-инженер | 10 (ИД), 9 (Журналы), 19 (Шаблоны+Нормативка) | 1 900 / 2 900 ₽·мес |
| **Прораб-Журнал** | Прораб / мастер СМР | 9 (Журналы), 16 (PWA), 11 (СК lite — фото/дефекты) | 1 900 / 2 900 ₽·мес |

**Годовая подписка:** `месяц × 12 × 0.8` → Базовый 18 240 ₽/год, Pro 27 840 ₽/год (скидка 20%).

**Реферальная программа 2.0:** двусторонняя мгновенная награда + **кросс-ролевой ×-бонус**:

| Тип реферала | Реферер (кредит на аккаунт) | Приглашённый (скидка на 1-й платёж) |
|--------------|------------------------------|---------------------------------------|
| Та же роль (сметчик → сметчик) | **50%** от первого платежа | **30%** |
| Другая роль (сметчик → прораба/ПТО) | **90%** от первого платежа | **40%** |

**Архитектура — Вариант B (чистый):** новая абстракция `Workspace` над `Organization`. Пользователь может одновременно владеть **PERSONAL** workspace (для подписки Профи) и состоять членом **COMPANY** workspace (где работодатель платит за Team-тариф).

---

## 1. Карта фаз

```
Фаза 1 (нед. 1–3): Workspace abstraction   ⬜ фундамент
Фаза 2 (нед. 4–5): Подписки + Feature-gate ⬜ движок платного доступа
Фаза 3 (нед. 6):   ЮKassa + Биллинг        ⬜ приём платежей
Фаза 4 (нед. 7–8): Сметчик-Студио          ⬜ первый Профи-пакет (MVP)
Фаза 5 (нед. 9):   Реферальная программа   ⬜ вирусный канал
Фаза 6 (нед. 10–11): ИД-Мастер             ⬜ второй Профи-пакет
Фаза 7 (нед. 12–13): Прораб-Журнал + PWA   ⬜ третий Профи-пакет
Фаза 8 (нед. 14):  Tilda + онбординг       ⬜ маркетинг-воронка
```

Каждая фаза — это отдельный PR в master, полностью рабочий и пригодный к запуску в изоляции.

---

# ФАЗА 1 — Workspace abstraction (3 недели) ⬜

> **Цель:** ввести слой `Workspace` между пользователем и данными. `Organization` остаётся для юридических B2B-компаний, но все ссылки на данные (проекты, сметы, журналы) переходят на `workspaceId`.
>
> **Критерий готовности:** все существующие B2B-данные продолжают работать через `COMPANY` workspaces, а новый пользователь при регистрации может создать `PERSONAL` workspace.

---

## Шаг 1.1 — Prisma: модели Workspace и WorkspaceMember (День 1–2)

### 1.1.1. Новые модели

```prisma
// prisma/schema.prisma

/// Рабочее пространство — абстракция над Organization
/// PERSONAL: один владелец, нельзя приглашать сотрудников, только гостей
/// COMPANY:  привязан к Organization, множество участников
model Workspace {
  id        String        @id @default(uuid())
  type      WorkspaceType
  name      String                           // "Личный Василия К." или "ООО СтройИнвест"
  slug      String        @unique            // URL-slug для /ws/[slug] (опционально)

  // Для COMPANY workspace (NULL для PERSONAL)
  organizationId String?   @unique
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Владелец (для PERSONAL = единственный; для COMPANY = создатель/главный админ)
  ownerId   String
  owner     User          @relation("WorkspaceOwner", fields: [ownerId], references: [id])

  // Подписка на этот workspace (актуальная)
  activeSubscriptionId String?       @unique
  activeSubscription   Subscription? @relation("WorkspaceActiveSubscription", fields: [activeSubscriptionId], references: [id])

  // История подписок
  subscriptions Subscription[] @relation("WorkspaceAllSubscriptions")

  // Участники
  members   WorkspaceMember[]

  // Все бизнес-данные (миграция из organizationId → workspaceId)
  buildingObjects BuildingObject[]
  estimates       EstimateVersion[]
  executionDocs   ExecutionDoc[]
  // ... (дополняется по мере миграции)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([ownerId])
  @@index([type])
  @@map("workspaces")
}

enum WorkspaceType {
  PERSONAL   // Solo: 1 владелец, подписка на Профи-пакет
  COMPANY    // Команда: привязана к Organization, подписка Team/Corporate
}

/// Участник workspace (включая гостей)
model WorkspaceMember {
  id          String         @id @default(uuid())
  workspaceId String
  workspace   Workspace      @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  userId      String
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  role        WorkspaceRole  @default(MEMBER)
  joinedAt    DateTime       @default(now())
  invitedById String?
  invitedBy   User?          @relation("WorkspaceMemberInviter", fields: [invitedById], references: [id])

  // Гостевой доступ — опциональные ограничения
  guestScope  Json?          // { contractIds: [...], expiresAt: "..." }

  @@unique([workspaceId, userId])
  @@index([userId])
  @@map("workspace_members")
}

enum WorkspaceRole {
  OWNER    // создатель workspace (в PERSONAL — единственный активный)
  ADMIN    // для COMPANY — полные права кроме удаления workspace
  MEMBER   // для COMPANY — обычный сотрудник
  GUEST    // readonly + комментарии, ограничен guestScope
}
```

### 1.1.2. Расширение существующих моделей

```prisma
// В model User добавить:
ownedWorkspaces     Workspace[]         @relation("WorkspaceOwner")
workspaceMemberships WorkspaceMember[]
workspaceInvites    WorkspaceMember[]    @relation("WorkspaceMemberInviter")

// В model Organization (оставляем, но делаем опциональной):
workspace Workspace?  // единственный COMPANY workspace этой организации

// В model BuildingObject, EstimateVersion, ExecutionDoc (и дальше по мере миграции):
workspaceId String?     // сначала опциональное — для backfill
workspace   Workspace?  @relation(fields: [workspaceId], references: [id])
@@index([workspaceId])
```

### 1.1.3. Команда для Claude Code

```
📋 ЗАДАЧА: Добавить абстракцию Workspace в Prisma-схему

Прочитай CLAUDE.md и prisma/schema.prisma (целиком).

1. Добавь в prisma/schema.prisma:
   - enum WorkspaceType { PERSONAL | COMPANY }
   - enum WorkspaceRole { OWNER | ADMIN | MEMBER | GUEST }
   - model Workspace (поля: id, type, name, slug, organizationId?, ownerId,
     activeSubscriptionId?, members, subscriptions, createdAt, updatedAt)
   - model WorkspaceMember (поля: id, workspaceId, userId, role,
     joinedAt, invitedById?, guestScope Json?)

2. В User добавь обратные связи:
   - ownedWorkspaces Workspace[] @relation("WorkspaceOwner")
   - workspaceMemberships WorkspaceMember[]
   - workspaceInvites WorkspaceMember[] @relation("WorkspaceMemberInviter")

3. В Organization добавь (опциональную):
   - workspace Workspace?

4. Создай миграцию:
   npx prisma migrate dev --name add_workspace_abstraction

5. Сгенерируй клиент:
   npx prisma generate

ВАЖНО:
- Поля activeSubscriptionId и Subscription-модель будут добавлены в Фазе 2 —
  пока закомментируй связь activeSubscription.
- workspaceId в BuildingObject/EstimateVersion/ExecutionDoc НЕ добавляй
  в этом шаге — это Шаг 1.3.
- Проверь npx tsc --noEmit
```

---

## Шаг 1.2 — Бэкофис: создание Workspace при регистрации (День 3–4)

### 1.2.1. Логика

**При регистрации организации (существующий flow):**
1. Создаётся `Organization` + `User` (owner) — как сейчас
2. **Новое:** автоматически создаётся `Workspace(type=COMPANY, organizationId=..., ownerId=..., name=orgName)`
3. **Новое:** создаётся `WorkspaceMember(userId=owner, role=OWNER)`

**При регистрации одиночного профи (новый flow):**
1. Создаётся только `User` (без Organization)
2. Создаётся `Workspace(type=PERSONAL, organizationId=NULL, ownerId=..., name=firstName + " " + lastName)`
3. Создаётся `WorkspaceMember(userId, role=OWNER)`
4. Пользователь попадает на онбординг-экран выбора роли (Шаг 4.х)

**При приглашении в существующую Organization:**
1. Принятие Invitation создаёт `WorkspaceMember(workspaceId=orgWorkspace, userId=...)` вместо прямого добавления в Organization

### 1.2.2. Команда для Claude Code

````
📋 ЗАДАЧА: Создать Workspace-фабрику и интегрировать в существующие flow

Файлы создать:
- src/lib/workspaces/create-workspace.ts
- src/lib/workspaces/get-active-workspace.ts
- src/lib/workspaces/switch-workspace.ts

Файлы изменить:
- src/app/api/auth/register/route.ts
- src/app/api/invitations/accept/route.ts
- src/lib/auth.ts (NextAuth callbacks — добавить activeWorkspaceId в JWT и session)

СОДЕРЖИМОЕ create-workspace.ts:
```typescript
import { db } from '@/lib/db';
import { WorkspaceType } from '@prisma/client';
import { slugify } from '@/lib/utils/slugify';

interface CreatePersonalParams {
  userId: string;
  userFirstName: string;
  userLastName: string;
}

interface CreateCompanyParams {
  userId: string;
  organizationId: string;
  organizationName: string;
}

export async function createPersonalWorkspace(params: CreatePersonalParams) {
  const name = `Личный ${params.userFirstName} ${params.userLastName}`.trim();
  const baseSlug = slugify(`${params.userFirstName}-${params.userLastName}-${params.userId.slice(0,6)}`);

  return await db.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: {
        type: WorkspaceType.PERSONAL,
        name,
        slug: baseSlug,
        ownerId: params.userId,
      },
    });

    await tx.workspaceMember.create({
      data: {
        workspaceId: ws.id,
        userId: params.userId,
        role: 'OWNER',
      },
    });

    return ws;
  });
}

export async function createCompanyWorkspace(params: CreateCompanyParams) {
  const baseSlug = slugify(`${params.organizationName}-${params.organizationId.slice(0,6)}`);

  return await db.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: {
        type: WorkspaceType.COMPANY,
        name: params.organizationName,
        slug: baseSlug,
        organizationId: params.organizationId,
        ownerId: params.userId,
      },
    });

    await tx.workspaceMember.create({
      data: {
        workspaceId: ws.id,
        userId: params.userId,
        role: 'OWNER',
      },
    });

    return ws;
  });
}
```

ИЗМЕНИТЬ register/route.ts — после создания Organization+User добавить:
```typescript
await createCompanyWorkspace({
  userId: user.id,
  organizationId: organization.id,
  organizationName: organization.name,
});
```

ИЗМЕНИТЬ invitations/accept/route.ts — после создания User вызвать:
```typescript
const orgWorkspace = await db.workspace.findUnique({
  where: { organizationId: invitation.organizationId }
});
if (orgWorkspace) {
  await db.workspaceMember.create({
    data: {
      workspaceId: orgWorkspace.id,
      userId: user.id,
      role: 'MEMBER',
      invitedById: invitation.invitedById,
    }
  });
}
```

NextAuth — добавить в JWT callback:
- token.activeWorkspaceId (по умолчанию первый workspace пользователя, priority: PERSONAL)
- session.user.activeWorkspaceId доступен везде

НЕ ЗАБУДЬ:
- src/types/next-auth.d.ts — расширить Session и JWT
- Запустить npx tsc --noEmit
- Обновить тесты если есть
````

---

## Шаг 1.3 — Backfill: перенос данных Organization → Workspace (День 5–8)

### 1.3.1. Что мигрируется

Все модели, имеющие `organizationId`, получают **опциональное** поле `workspaceId`. Backfill-скрипт заполняет `workspaceId = COMPANY workspace для этой org`. После проверки делаем `workspaceId` обязательным, `organizationId` — опциональным.

**Критичные модели (Этап А — обязательно):**
- `BuildingObject` (проекты)
- `EstimateVersion` (сметы)
- `ExecutionDoc` (ИД)
- `SpecialJournal` (журналы)
- `Contract`
- `MaterialRequest`, `SupplierOrder`, `Warehouse`
- `Report`, `ReportTemplate`
- `Task`, `TaskGroup` (планировщик)

**Не-критичные (Этап Б — можно отложить):**
- Справочники (`ContractCategory`, `TaskType`, etc.) — они всё равно organization-scoped, можно оставить `organizationId`
- `Invitation`, `WorkflowRegulation` — B2B-only

### 1.3.2. Команда для Claude Code (Этап А)

````
📋 ЗАДАЧА: Backfill organizationId → workspaceId в критичных моделях

Шаг 1. Prisma — добавить ОПЦИОНАЛЬНОЕ поле workspaceId в каждой модели:
```prisma
model BuildingObject {
  // ... существующие поля
  workspaceId String?
  workspace   Workspace? @relation(fields: [workspaceId], references: [id])
  @@index([workspaceId])
}
```
Повторить для: EstimateVersion, ExecutionDoc, SpecialJournal, Contract,
MaterialRequest, SupplierOrder, Warehouse, Report, ReportTemplate, Task, TaskGroup.

Шаг 2. Миграция: npx prisma migrate dev --name add_workspaceid_optional

Шаг 3. Backfill-скрипт: scripts/backfill-workspace-ids.ts
```typescript
import { db } from '@/lib/db';

async function backfill() {
  // Для каждой Organization найти её COMPANY workspace
  const orgs = await db.organization.findMany({
    select: { id: true, workspace: { select: { id: true } } }
  });

  for (const org of orgs) {
    if (!org.workspace) {
      console.warn(`Organization ${org.id} has no workspace — skipping`);
      continue;
    }
    const wsId = org.workspace.id;

    // Обновить все связанные модели батчем
    await db.buildingObject.updateMany({
      where: { organizationId: org.id, workspaceId: null },
      data: { workspaceId: wsId }
    });
    await db.estimateVersion.updateMany({
      where: { organizationId: org.id, workspaceId: null },
      data: { workspaceId: wsId }
    });
    // ... повторить для всех 12 моделей

    console.log(`Org ${org.id} → ws ${wsId} backfilled`);
  }
}

backfill().then(() => process.exit(0));
```

Добавить в package.json:
"backfill:ws": "tsx scripts/backfill-workspace-ids.ts"

Запустить:
npm run backfill:ws

Шаг 4. Валидация:
Написать скрипт scripts/validate-workspace-backfill.ts который проверяет:
- Каждая BuildingObject имеет workspaceId
- workspaceId соответствует workspace организации
- Нет «сирот»

Если валидация зелёная — pull request готов.

ВАЖНО:
- organizationId в этих моделях НЕ удаляем — это делается в Этап В (после того,
  как все API-роуты будут переписаны на workspaceId)
- Скрипт backfill идемпотентен — можно запускать несколько раз
```
````

### 1.3.3. Этап Б: переписать критичные API-роуты на workspaceId

````
📋 ЗАДАЧА: Переписать фильтрацию в API с organizationId на workspaceId

Область: все роуты в src/app/api/**/* которые используют
session.user.organizationId для фильтрации.

Подход: централизованный хелпер в src/lib/auth-utils.ts

```typescript
// Вернёт активный workspace пользователя (из session.user.activeWorkspaceId)
// или бросит 401. Дополнительно можно требовать определённый type.
export async function getActiveWorkspaceOrThrow(opts?: {
  type?: WorkspaceType;
  roles?: WorkspaceRole[];  // пользователь должен иметь одну из этих ролей
}): Promise<Workspace> {
  const session = await getSessionOrThrow();
  const wsId = session.user.activeWorkspaceId;
  if (!wsId) throw new NextResponse(null, { status: 401 });

  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: wsId, userId: session.user.id } },
    include: { workspace: true }
  });
  if (!member) throw new NextResponse(null, { status: 403 });

  if (opts?.type && member.workspace.type !== opts.type)
    throw new NextResponse(null, { status: 403 });
  if (opts?.roles && !opts.roles.includes(member.role))
    throw new NextResponse(null, { status: 403 });

  return member.workspace;
}
```

В каждом роуте заменить:
- `const orgId = session.user.organizationId;`
- `where: { organizationId: orgId }`
→ 
- `const ws = await getActiveWorkspaceOrThrow();`
- `where: { workspaceId: ws.id }`

Список критичных роутов к переписи (приоритет):
1. src/app/api/projects/**/*  (самый большой массив)
2. src/app/api/objects/**/*
3. src/app/api/estimates/**/*
4. src/app/api/reports/**/*

Не переписывай роуты справочников (они могут оставаться organizationId-scoped).

После каждого батча:
- npx tsc --noEmit
- Smoke-тест в браузере

Окончание Фазы 1:
- Все данные работают через workspaceId
- Старые B2B-пользователи ничего не заметили (их workspace COMPANY = их organization)
- Новый PERSONAL workspace создаётся, но пока «пустой» — подписок нет
````

---

# ФАЗА 2 — Подписки и Feature-gate (2 недели) ⬜

> **Цель:** движок подписок, который работает и для B2B (Team/Corporate), и для B2C (Профи-пакеты). Feature-gate проверяет доступ на уровне API и UI.

---

## Шаг 2.1 — Prisma: модели Subscription, SubscriptionPlan, Payment (День 1)

### 2.1.1. Модели

```prisma
/// Тариф (каталог) — системная сущность, не редактируется организацией
model SubscriptionPlan {
  id              String   @id @default(uuid())
  code            String   @unique          // "smetchik_studio_pro", "team_10users", "corporate"
  name            String                    // "Сметчик-Студио Pro"
  description     String?

  planType        PlanType                   // SOLO_BASIC | SOLO_PRO | TEAM | CORPORATE | FREE

  // Для каких ролей предназначен (SOLO_*). Для TEAM/CORP — NULL.
  targetRole      ProfessionalRole?          // SMETCHIK | PTO | FOREMAN | ...

  // Только для PERSONAL workspaces? (SOLO_*: true; TEAM/CORP: false)
  requiresPersonalWorkspace Boolean @default(false)

  // Цены в копейках
  priceMonthlyRub Int
  priceYearlyRub  Int                        // уже со скидкой 20%

  // Набор включённых фич (string-идентификаторы)
  features        String[]                   // ["estimates", "estimates_compare", "estimates_public_link"]

  // Лимиты (JSON для гибкости)
  limits          Json                       // { maxObjects: 1, maxStorageGB: 10, maxGuests: 5, maxDocumentsPerMonth: 50 }

  // Видимость в UI
  isActive        Boolean  @default(true)
  isFeatured      Boolean  @default(false)   // «Популярный» бейдж
  displayOrder    Int      @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  subscriptions   Subscription[]

  @@map("subscription_plans")
}

enum PlanType {
  FREE           // бессрочный Freemium
  SOLO_BASIC     // Профи Базовый 1 900 ₽
  SOLO_PRO       // Профи Pro 2 900 ₽
  TEAM           // Команда
  CORPORATE      // Корпоративный
}

enum ProfessionalRole {
  SMETCHIK         // сметчик
  PTO              // ПТО-инженер
  FOREMAN          // прораб / мастер СМР
  SK_INSPECTOR     // инженер СК / технадзор
  SUPPLIER         // снабженец / закупщик
  PROJECT_MANAGER  // РП / ГИП
  ACCOUNTANT       // бухгалтер строительства
}

/// Подписка — экземпляр плана, привязанный к workspace
model Subscription {
  id            String           @id @default(uuid())
  workspaceId   String
  workspace     Workspace        @relation("WorkspaceAllSubscriptions", fields: [workspaceId], references: [id], onDelete: Cascade)

  planId        String
  plan          SubscriptionPlan @relation(fields: [planId], references: [id])

  status        SubscriptionStatus

  // Цикл биллинга
  billingPeriod BillingPeriod    // MONTHLY | YEARLY
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  cancelAtPeriodEnd  Boolean     @default(false)
  canceledAt         DateTime?

  // Триал
  trialEnd      DateTime?

  // ЮKassa integration
  yookassaSubscriptionId String? @unique     // ID autopayment subscription

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Обратная связь с workspace.activeSubscriptionId
  activeFor     Workspace? @relation("WorkspaceActiveSubscription")

  // Платежи по этой подписке
  payments      Payment[]

  @@index([workspaceId])
  @@index([status])
  @@index([currentPeriodEnd])
  @@map("subscriptions")
}

enum SubscriptionStatus {
  TRIAL        // в триале
  ACTIVE       // оплачено и действует
  PAST_DUE     // просрочена, grace period
  CANCELED     // отменена пользователем, действует до currentPeriodEnd
  EXPIRED      // закончилась, доступ закрыт
  INCOMPLETE   // создана, ждёт первой оплаты
}

enum BillingPeriod {
  MONTHLY
  YEARLY
}

/// Платёж
model Payment {
  id            String        @id @default(uuid())
  subscriptionId String?
  subscription  Subscription? @relation(fields: [subscriptionId], references: [id])

  workspaceId   String
  workspace     Workspace     @relation(fields: [workspaceId], references: [id])

  userId        String        // кто инициировал
  user          User          @relation("PaymentInitiator", fields: [userId], references: [id])

  source        PaymentSource // APP | TILDA
  status        PaymentStatus

  amountRub     Int           // в копейках
  currency      String        @default("RUB")

  yookassaPaymentId String?   @unique
  yookassaIdempotencyKey String?

  // Использован реферальный кредит?
  referralCreditApplied Int   @default(0)  // в копейках
  // Использован реферальный discount?
  referralDiscountApplied Int @default(0)  // в копейках
  referralId    String?
  referral      Referral?     @relation(fields: [referralId], references: [id])

  paidAt        DateTime?
  failedAt      DateTime?
  refundedAt    DateTime?
  failureReason String?

  createdAt     DateTime      @default(now())

  @@index([workspaceId])
  @@index([status])
  @@index([yookassaPaymentId])
  @@map("payments")
}

enum PaymentSource {
  APP          // прямо из интерфейса через ЮKassa виджет
  TILDA        // через Tilda-форму (webhook)
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
}
```

### 2.1.2. Связи в существующих моделях

```prisma
// В model Workspace раскомментировать / добавить:
activeSubscriptionId String?       @unique
activeSubscription   Subscription? @relation("WorkspaceActiveSubscription", fields: [activeSubscriptionId], references: [id])
subscriptions        Subscription[] @relation("WorkspaceAllSubscriptions")
payments             Payment[]

// В model User:
paymentsInitiated    Payment[] @relation("PaymentInitiator")
professionalRole     ProfessionalRole?  // выбрано в онбординге (опционально)
```

### 2.1.3. Команда для Claude Code

```
📋 ЗАДАЧА: Добавить модели подписок в Prisma

Файлы:
- prisma/schema.prisma (добавить модели и enum-ы)

Шаги:
1. Добавить enum-ы: PlanType, ProfessionalRole, SubscriptionStatus,
   BillingPeriod, PaymentSource, PaymentStatus
2. Добавить модели: SubscriptionPlan, Subscription, Payment
3. Расширить Workspace (activeSubscription, subscriptions, payments)
4. Расширить User (paymentsInitiated, professionalRole)
5. Миграция: npx prisma migrate dev --name add_subscriptions_payments
6. npx prisma generate
7. npx tsc --noEmit

ВАЖНО: все цены в КОПЕЙКАХ (Int), не в рублях. Это убирает float-арифметику.
```

---

## Шаг 2.2 — Seed тарифных планов (День 2)

### 2.2.1. Каталог Фазы 1

```typescript
// prisma/seeds/subscription-plans.ts

export const PHASE_1_PLANS = [
  // ============ FREE (бесплатный) ============
  {
    code: 'free',
    name: 'Бесплатный',
    planType: 'FREE',
    priceMonthlyRub: 0,
    priceYearlyRub: 0,
    requiresPersonalWorkspace: false,
    features: ['view_only', 'comments', 'profile'],
    limits: { maxObjects: 0, maxStorageGB: 0.5, maxGuests: 0 },
    displayOrder: 0,
  },

  // ============ СМЕТЧИК-СТУДИО ============
  {
    code: 'smetchik_studio_basic',
    name: 'Сметчик-Студио Базовый',
    planType: 'SOLO_BASIC',
    targetRole: 'SMETCHIK',
    priceMonthlyRub: 190000,  // 1900 ₽ = 190 000 коп.
    priceYearlyRub: 1824000,  // 18 240 ₽
    requiresPersonalWorkspace: true,
    features: [
      'estimates',
      'estimates_import',
      'estimates_compare_basic',
      'contracts_lite',
      'templates_library',
      'normative_library',
    ],
    limits: {
      maxActiveEstimates: 5,
      maxStorageGB: 1,
      maxGuests: 3,
      maxObjects: 2,
    },
    displayOrder: 10,
  },
  {
    code: 'smetchik_studio_pro',
    name: 'Сметчик-Студио Pro',
    planType: 'SOLO_PRO',
    targetRole: 'SMETCHIK',
    priceMonthlyRub: 290000,
    priceYearlyRub: 2784000,
    requiresPersonalWorkspace: true,
    features: [
      'estimates',
      'estimates_import',
      'estimates_compare_advanced',
      'estimates_export_grand_smeta',
      'estimates_public_link',
      'estimates_history',
      'contracts_lite',
      'templates_library',
      'normative_library',
      'fgis_cs_prices',
    ],
    limits: {
      maxActiveEstimates: -1,    // безлимит
      maxStorageGB: 10,
      maxGuests: 10,
      maxObjects: 5,
    },
    isFeatured: true,
    displayOrder: 11,
  },

  // ============ ИД-МАСТЕР ============
  {
    code: 'id_master_basic',
    name: 'ИД-Мастер Базовый',
    planType: 'SOLO_BASIC',
    targetRole: 'PTO',
    priceMonthlyRub: 190000,
    priceYearlyRub: 1824000,
    requiresPersonalWorkspace: true,
    features: [
      'execution_docs',
      'aosr_generation',
      'ozr_generation',
      'journals_basic',
      'templates_library',
      'normative_library',
    ],
    limits: {
      maxDocumentsPerMonth: 50,
      maxStorageGB: 5,
      maxGuests: 3,
      maxObjects: 1,
    },
    displayOrder: 20,
  },
  {
    code: 'id_master_pro',
    name: 'ИД-Мастер Pro',
    planType: 'SOLO_PRO',
    targetRole: 'PTO',
    priceMonthlyRub: 290000,
    priceYearlyRub: 2784000,
    requiresPersonalWorkspace: true,
    features: [
      'execution_docs',
      'aosr_generation',
      'ozr_generation',
      'ks2_ks3_generation',
      'avk_atg_generation',
      'journals_basic',
      'journals_full',
      'templates_library',
      'normative_library',
      'xml_minstroy_export',
      'id_registry_auto',
      'approval_routes',
    ],
    limits: {
      maxDocumentsPerMonth: -1,
      maxStorageGB: 25,
      maxGuests: 10,
      maxObjects: 5,
    },
    isFeatured: true,
    displayOrder: 21,
  },

  // ============ ПРОРАБ-ЖУРНАЛ ============
  {
    code: 'foreman_journal_basic',
    name: 'Прораб-Журнал Базовый',
    planType: 'SOLO_BASIC',
    targetRole: 'FOREMAN',
    priceMonthlyRub: 190000,
    priceYearlyRub: 1824000,
    requiresPersonalWorkspace: true,
    features: [
      'journals_basic',
      'mobile_pwa',
      'photos_gps',
      'defects_lite',
    ],
    limits: {
      maxObjects: 1,
      maxStorageGB: 5,
      maxPhotosPerMonth: 500,
      maxGuests: 2,
    },
    displayOrder: 30,
  },
  {
    code: 'foreman_journal_pro',
    name: 'Прораб-Журнал Pro',
    planType: 'SOLO_PRO',
    targetRole: 'FOREMAN',
    priceMonthlyRub: 290000,
    priceYearlyRub: 2784000,
    requiresPersonalWorkspace: true,
    features: [
      'journals_basic',
      'journals_full',
      'mobile_pwa',
      'mobile_offline',
      'voice_input',
      'photos_gps',
      'photos_annotations',
      'defects_lite',
      'defects_full',
      'geofencing',
    ],
    limits: {
      maxObjects: 5,
      maxStorageGB: 25,
      maxPhotosPerMonth: -1,
      maxGuests: 10,
    },
    isFeatured: true,
    displayOrder: 31,
  },
];
```

### 2.2.2. Команда для Claude Code

````
📋 ЗАДАЧА: Seed тарифных планов Фазы 1

Файлы:
- prisma/seeds/subscription-plans.ts (массив PHASE_1_PLANS выше)
- prisma/seed.ts — добавить вызов seedSubscriptionPlans()

```typescript
// prisma/seed.ts
import { PHASE_1_PLANS } from './seeds/subscription-plans';

async function seedSubscriptionPlans() {
  for (const plan of PHASE_1_PLANS) {
    await db.subscriptionPlan.upsert({
      where: { code: plan.code },
      create: plan as any,
      update: plan as any,
    });
  }
  console.log(`Seeded ${PHASE_1_PLANS.length} subscription plans`);
}

// вызвать в main()
await seedSubscriptionPlans();
```

Запустить:
npx prisma db seed

Проверить:
- В БД 7 записей в subscription_plans
- smetchik_studio_pro, id_master_pro, foreman_journal_pro — isFeatured=true
- Все requiresPersonalWorkspace=true для SOLO_*
````

---

## Шаг 2.3 — Feature-gate middleware (День 3–4)

### 2.3.1. Логика

Middleware `requireFeature(workspaceId, featureKey)` проверяет:
1. Есть ли у workspace активная подписка (или триал)
2. Включён ли данный feature в `plan.features`
3. Если нет — бросает `PaymentRequiredError` (HTTP 402)

Для лимитов отдельный `requireLimit(workspaceId, limitKey, currentUsage)`:
1. Проверяет `plan.limits[limitKey]`
2. Если `-1` — безлимит
3. Если `currentUsage >= limit` — бросает `LimitExceededError`

### 2.3.2. Команда для Claude Code

````
📋 ЗАДАЧА: Создать feature-gate middleware

Файлы:
- src/lib/subscriptions/errors.ts
- src/lib/subscriptions/get-active-plan.ts
- src/lib/subscriptions/require-feature.ts
- src/lib/subscriptions/require-limit.ts
- src/lib/subscriptions/features.ts (константы-каталог)

СОДЕРЖИМОЕ errors.ts:
```typescript
export class PaymentRequiredError extends Error {
  constructor(
    public feature: string,
    public workspaceId: string,
    public upgradePlanCode?: string
  ) {
    super(`Feature "${feature}" requires upgrade`);
  }
}

export class LimitExceededError extends Error {
  constructor(
    public limitKey: string,
    public limit: number,
    public current: number,
    public workspaceId: string
  ) {
    super(`Limit "${limitKey}" exceeded (${current}/${limit})`);
  }
}
```

СОДЕРЖИМОЕ features.ts:
```typescript
// Все фичи, существующие в системе. Помогает избежать опечаток.
export const FEATURES = {
  // Сметы
  ESTIMATES: 'estimates',
  ESTIMATES_IMPORT: 'estimates_import',
  ESTIMATES_COMPARE_BASIC: 'estimates_compare_basic',
  ESTIMATES_COMPARE_ADVANCED: 'estimates_compare_advanced',
  ESTIMATES_EXPORT_GRAND_SMETA: 'estimates_export_grand_smeta',
  ESTIMATES_PUBLIC_LINK: 'estimates_public_link',
  ESTIMATES_HISTORY: 'estimates_history',
  FGIS_CS_PRICES: 'fgis_cs_prices',

  // ИД
  EXECUTION_DOCS: 'execution_docs',
  AOSR_GENERATION: 'aosr_generation',
  OZR_GENERATION: 'ozr_generation',
  KS2_KS3_GENERATION: 'ks2_ks3_generation',
  AVK_ATG_GENERATION: 'avk_atg_generation',
  XML_MINSTROY_EXPORT: 'xml_minstroy_export',
  ID_REGISTRY_AUTO: 'id_registry_auto',
  APPROVAL_ROUTES: 'approval_routes',

  // Журналы
  JOURNALS_BASIC: 'journals_basic',
  JOURNALS_FULL: 'journals_full',

  // Мобильное
  MOBILE_PWA: 'mobile_pwa',
  MOBILE_OFFLINE: 'mobile_offline',
  VOICE_INPUT: 'voice_input',

  // СК
  DEFECTS_LITE: 'defects_lite',
  DEFECTS_FULL: 'defects_full',
  PHOTOS_GPS: 'photos_gps',
  PHOTOS_ANNOTATIONS: 'photos_annotations',
  GEOFENCING: 'geofencing',

  // Общие
  CONTRACTS_LITE: 'contracts_lite',
  CONTRACTS_FULL: 'contracts_full',
  TEMPLATES_LIBRARY: 'templates_library',
  NORMATIVE_LIBRARY: 'normative_library',
  VIEW_ONLY: 'view_only',
  COMMENTS: 'comments',
  PROFILE: 'profile',
} as const;

export type FeatureKey = typeof FEATURES[keyof typeof FEATURES];

export const LIMIT_KEYS = {
  MAX_OBJECTS: 'maxObjects',
  MAX_STORAGE_GB: 'maxStorageGB',
  MAX_GUESTS: 'maxGuests',
  MAX_ACTIVE_ESTIMATES: 'maxActiveEstimates',
  MAX_DOCUMENTS_PER_MONTH: 'maxDocumentsPerMonth',
  MAX_PHOTOS_PER_MONTH: 'maxPhotosPerMonth',
} as const;
```

СОДЕРЖИМОЕ get-active-plan.ts:
```typescript
import { db } from '@/lib/db';
import type { SubscriptionPlan, Subscription } from '@prisma/client';

export async function getActivePlan(workspaceId: string): Promise<{
  plan: SubscriptionPlan;
  subscription: Subscription | null;
  isInGracePeriod: boolean;
} | null> {
  const ws = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      activeSubscription: {
        include: { plan: true }
      }
    }
  });

  if (!ws) return null;

  // Если нет активной подписки — возвращаем FREE план
  if (!ws.activeSubscription) {
    const freePlan = await db.subscriptionPlan.findUnique({
      where: { code: 'free' }
    });
    return freePlan ? { plan: freePlan, subscription: null, isInGracePeriod: false } : null;
  }

  const sub = ws.activeSubscription;
  const now = new Date();

  // Проверяем, не истекла ли подписка
  if (sub.status === 'EXPIRED' || sub.status === 'CANCELED' && sub.currentPeriodEnd < now) {
    const freePlan = await db.subscriptionPlan.findUnique({ where: { code: 'free' } });
    return freePlan ? { plan: freePlan, subscription: null, isInGracePeriod: false } : null;
  }

  // Grace period: 7 дней после PAST_DUE
  const isInGracePeriod = sub.status === 'PAST_DUE' &&
    (now.getTime() - sub.currentPeriodEnd.getTime()) < 7 * 24 * 60 * 60 * 1000;

  return {
    plan: sub.plan,
    subscription: sub,
    isInGracePeriod,
  };
}
```

СОДЕРЖИМОЕ require-feature.ts:
```typescript
import { getActivePlan } from './get-active-plan';
import { PaymentRequiredError } from './errors';
import type { FeatureKey } from './features';

export async function requireFeature(
  workspaceId: string,
  feature: FeatureKey
): Promise<void> {
  const active = await getActivePlan(workspaceId);
  if (!active) throw new PaymentRequiredError(feature, workspaceId);
  if (!active.plan.features.includes(feature)) {
    throw new PaymentRequiredError(feature, workspaceId);
  }
  // isInGracePeriod — даём доступ, но UI покажет предупреждение
}

export async function hasFeature(
  workspaceId: string,
  feature: FeatureKey
): Promise<boolean> {
  try {
    await requireFeature(workspaceId, feature);
    return true;
  } catch {
    return false;
  }
}
```

СОДЕРЖИМОЕ require-limit.ts:
```typescript
import { getActivePlan } from './get-active-plan';
import { LimitExceededError } from './errors';

export async function requireLimit(
  workspaceId: string,
  limitKey: string,
  currentUsage: number
): Promise<void> {
  const active = await getActivePlan(workspaceId);
  if (!active) throw new LimitExceededError(limitKey, 0, currentUsage, workspaceId);

  const limits = active.plan.limits as Record<string, number>;
  const limit = limits?.[limitKey];
  if (limit === undefined) return;         // лимит не задан = безлимит
  if (limit === -1) return;                // -1 = явный безлимит
  if (currentUsage >= limit) {
    throw new LimitExceededError(limitKey, limit, currentUsage, workspaceId);
  }
}
```

Глобальный обработчик в src/utils/api.ts:
```typescript
// Добавить в apiErrorResponse
if (error instanceof PaymentRequiredError) {
  return NextResponse.json({
    error: 'PaymentRequired',
    feature: error.feature,
    upgradePlanCode: error.upgradePlanCode ?? null,
    message: `Эта функция требует обновления тарифа`,
  }, { status: 402 });
}
if (error instanceof LimitExceededError) {
  return NextResponse.json({
    error: 'LimitExceeded',
    limitKey: error.limitKey,
    limit: error.limit,
    current: error.current,
  }, { status: 403 });
}
```

Проверка:
- npx tsc --noEmit
- Добавить unit-тесты для require-feature (jest)
````

---

## Шаг 2.4 — React-хук useFeature + компонент PaywallBanner (День 5)

````
📋 ЗАДАЧА: Клиентский feature-gate

Файлы:
- src/hooks/use-active-plan.ts
- src/hooks/use-feature.ts
- src/components/subscriptions/PaywallBanner.tsx
- src/components/subscriptions/FeatureGate.tsx

use-active-plan.ts:
```typescript
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';

export function useActivePlan() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: ['active-plan', session?.user?.activeWorkspaceId],
    queryFn: async () => {
      const r = await fetch('/api/workspaces/active/subscription');
      if (!r.ok) throw new Error();
      return r.json();
    },
    enabled: !!session?.user?.activeWorkspaceId,
    staleTime: 60_000,
  });
}
```

use-feature.ts:
```typescript
import { useActivePlan } from './use-active-plan';
import type { FeatureKey } from '@/lib/subscriptions/features';

export function useFeature(feature: FeatureKey): {
  hasAccess: boolean;
  isLoading: boolean;
  planCode: string | null;
} {
  const { data, isLoading } = useActivePlan();
  if (isLoading) return { hasAccess: false, isLoading: true, planCode: null };
  const features = data?.plan?.features ?? [];
  return {
    hasAccess: features.includes(feature),
    isLoading: false,
    planCode: data?.plan?.code ?? null,
  };
}
```

FeatureGate.tsx — обёртка для условного рендера:
```typescript
'use client';
import { useFeature } from '@/hooks/use-feature';
import { PaywallBanner } from './PaywallBanner';
import type { FeatureKey } from '@/lib/subscriptions/features';

interface Props {
  feature: FeatureKey;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function FeatureGate({ feature, fallback, children }: Props) {
  const { hasAccess, isLoading } = useFeature(feature);
  if (isLoading) return null;
  if (hasAccess) return <>{children}</>;
  return fallback ?? <PaywallBanner feature={feature} />;
}
```

PaywallBanner.tsx — красивый блок «Обнови тариф»:
- shadcn/ui Card
- Заголовок «Эта функция доступна в Pro»
- Краткое описание что разблокирует
- Кнопка «Посмотреть тарифы» → /settings/subscription
- Опционально: «Начать бесплатный 14-дневный триал»

Использование (пример):
```tsx
<FeatureGate feature={FEATURES.ESTIMATES_EXPORT_GRAND_SMETA}>
  <Button onClick={exportGrandSmeta}>Экспорт в Гранд-Смета</Button>
</FeatureGate>
```

Проверка:
- Создать пользователя без подписки (FREE)
- Зайти на страницу со FeatureGate — увидеть PaywallBanner
- Апгрейд до Pro (руками в БД) — увидеть Button
````

---

## Шаг 2.5 — API: активная подписка, список планов (День 6)

````
📋 ЗАДАЧА: API-роуты подписок

Создать:
- src/app/api/subscription-plans/route.ts
  GET — список всех активных SubscriptionPlan (isActive=true), сортировка по displayOrder
  Публичный роут (без auth) — для лендинга

- src/app/api/workspaces/active/subscription/route.ts
  GET — активная подписка текущего workspace
  Возвращает { plan, subscription, isInGracePeriod, usage }
  usage = текущее потребление лимитов (maxObjects → count(BuildingObject), etc.)

- src/app/api/workspaces/[wsId]/subscription/route.ts
  GET — подписка workspace по ID (только для участника)

- src/app/api/workspaces/active/subscription/cancel/route.ts
  POST — отменить автопродление (cancelAtPeriodEnd=true)

Все роуты — ApiResponse<T>, Zod-валидация, getActiveWorkspaceOrThrow для защищённых.

Проверка:
- npx tsc --noEmit
- curl -X GET /api/subscription-plans → 7 планов
- curl -X GET /api/workspaces/active/subscription → free plan если нет подписки
````

---

# ФАЗА 3 — ЮKassa интеграция (1 неделя) ⬜

## Шаг 3.1 — Конфигурация и базовый клиент (День 1)

````
📋 ЗАДАЧА: ЮKassa SDK и env

Файлы:
- package.json — установить: npm install @a2seven/yoo-checkout
- .env.example — добавить:
  YOOKASSA_SHOP_ID=
  YOOKASSA_SECRET_KEY=
  YOOKASSA_WEBHOOK_SECRET=
- src/lib/env.ts — добавить в REQUIRED_ENV_VARS
- src/lib/payments/yookassa-client.ts:

```typescript
import { YooCheckout } from '@a2seven/yoo-checkout';
import { env } from '@/lib/env';

export const yookassa = new YooCheckout({
  shopId: env.YOOKASSA_SHOP_ID,
  secretKey: env.YOOKASSA_SECRET_KEY,
});
```

- src/lib/payments/create-payment.ts — универсальная фабрика:
```typescript
import { yookassa } from './yookassa-client';
import { v4 as uuidv4 } from 'uuid';

interface CreatePaymentParams {
  workspaceId: string;
  subscriptionPlanId: string;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  amountRub: number;          // в копейках
  userId: string;
  returnUrl: string;
  description: string;
  referralCreditApplied?: number;
  referralDiscountApplied?: number;
  referralId?: string;
  saveForAutopay?: boolean;
}

export async function createPayment(p: CreatePaymentParams) {
  const idempotenceKey = uuidv4();

  const yooPayment = await yookassa.createPayment({
    amount: {
      value: (p.amountRub / 100).toFixed(2),  // в рублях
      currency: 'RUB',
    },
    confirmation: {
      type: 'embedded',
      return_url: p.returnUrl,
    },
    capture: true,
    description: p.description,
    save_payment_method: p.saveForAutopay ?? true,
    metadata: {
      workspaceId: p.workspaceId,
      subscriptionPlanId: p.subscriptionPlanId,
      billingPeriod: p.billingPeriod,
    },
  }, idempotenceKey);

  // Сохраняем в БД
  const payment = await db.payment.create({
    data: {
      workspaceId: p.workspaceId,
      userId: p.userId,
      source: 'APP',
      status: 'PENDING',
      amountRub: p.amountRub,
      yookassaPaymentId: yooPayment.id,
      yookassaIdempotencyKey: idempotenceKey,
      referralCreditApplied: p.referralCreditApplied ?? 0,
      referralDiscountApplied: p.referralDiscountApplied ?? 0,
      referralId: p.referralId,
    },
  });

  return {
    paymentId: payment.id,
    yookassaPaymentId: yooPayment.id,
    confirmationToken: yooPayment.confirmation.confirmation_token,
  };
}
```

Проверка:
- Тест-ключи ЮKassa из dashboard.yookassa.ru
- Создать платёж и увидеть его в /payments ЮKassa dashboard
````

---

## Шаг 3.2 — Webhook обработка (День 2–3)

````
📋 ЗАДАЧА: Webhook /api/webhooks/yookassa

Файлы:
- src/app/api/webhooks/yookassa/route.ts

Логика:
1. Проверить подпись webhook (IP-allow-list ЮKassa + X-Yookassa-Signature)
2. Парсить event.type (payment.succeeded, payment.canceled, refund.succeeded)
3. Найти Payment по yookassaPaymentId
4. Обновить status, paidAt/failedAt
5. Если payment.succeeded:
   a. Найти/создать Subscription (workspaceId + planId)
   b. status=ACTIVE, currentPeriodStart=now, currentPeriodEnd=+1 мес или +1 год
   c. Workspace.activeSubscriptionId = sub.id
   d. Trigger: начислить реферальные бонусы (Фаза 5)
6. Если payment.canceled → Payment.status=FAILED, логирование

ВАЖНО:
- Webhook идемпотентен — повторный вызов с тем же yookassaPaymentId не должен
  создавать вторую подписку
- Всё в одной транзакции db.$transaction
- Rate limit: только ЮKassa IPs (185.71.76.0/27, 185.71.77.0/27, 77.75.153.0/25,
  77.75.154.128/25, 77.75.156.11, 77.75.156.35, 2a02:5180::/32)

Код skeleton:
```typescript
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { event, object: yooPayment } = body;

  if (event !== 'payment.succeeded' && event !== 'payment.canceled') {
    return NextResponse.json({ ok: true });  // игнорируем
  }

  const payment = await db.payment.findUnique({
    where: { yookassaPaymentId: yooPayment.id },
  });
  if (!payment) {
    logger.warn({ yooId: yooPayment.id }, 'Webhook: payment not found');
    return NextResponse.json({ ok: true });
  }

  if (payment.status === 'SUCCEEDED' && event === 'payment.succeeded') {
    return NextResponse.json({ ok: true });  // идемпотентность
  }

  if (event === 'payment.succeeded') {
    await db.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCEEDED', paidAt: new Date() },
      });

      // Активировать подписку
      const plan = await tx.subscriptionPlan.findUnique({...});
      const period = /* определить из yooPayment.metadata.billingPeriod */;

      const sub = await tx.subscription.upsert({
        where: { id: payment.subscriptionId ?? '_none_' },
        create: { ... },
        update: { status: 'ACTIVE', currentPeriodEnd: /* +1 месяц или +1 год */ },
      });

      await tx.workspace.update({
        where: { id: payment.workspaceId },
        data: { activeSubscriptionId: sub.id },
      });

      // Реферальная логика (импорт из src/lib/referrals/process-referral.ts)
      if (payment.referralId) {
        await processReferralReward(tx, payment);
      }
    });
  }

  return NextResponse.json({ ok: true });
}
```

Проверка:
- Подделать webhook через curl с test-payment
- Убедиться что Subscription создаётся, Workspace.activeSubscriptionId обновляется
- Повторный вызов = no-op
````

---

## Шаг 3.3 — Checkout UI (День 4–5)

````
📋 ЗАДАЧА: Страница оформления подписки

Файлы:
- src/app/(dashboard)/settings/subscription/page.tsx — список тарифов + текущий
- src/app/(dashboard)/settings/subscription/checkout/[planId]/page.tsx — оплата
- src/components/subscriptions/PlanCard.tsx
- src/components/subscriptions/CheckoutForm.tsx
- src/app/api/workspaces/active/subscription/checkout/route.ts

UX flow:
1. /settings/subscription — видит 4 колонки: Free, Basic, Pro текущего типа, Team (upgrade)
2. Кликает «Выбрать Pro» → /settings/subscription/checkout/smetchik_studio_pro
3. Тумблер «Месяц/Год -20%»
4. Показаны применимые рефереальные скидки (если пришёл по коду)
5. Показан реферальный кредит (если есть накопленный)
6. Итого к оплате
7. Кнопка «Оплатить» → POST /api/workspaces/active/subscription/checkout
   → получает confirmationToken
   → встраивает ЮKassa виджет (window.YooMoneyCheckoutWidget)
8. После успешной оплаты: redirect на /settings/subscription?success=1
9. Webhook в фоне активирует подписку (обычно за 3–10 сек)

Виджет ЮKassa:
```typescript
// В CheckoutForm.tsx
const checkout = new window.YooMoneyCheckoutWidget({
  confirmation_token: confirmationToken,
  return_url: `${window.location.origin}/settings/subscription?success=1`,
  customization: {
    colors: { controlPrimary: '#2563EB' },
  },
  error_callback: (error) => { /* показать toast */ },
});
checkout.render('payment-form');
```

Файл next/head — подключить <script src="https://yookassa.ru/checkout-widget/v1/checkout-widget.js"/>

Все цены в UI — в рублях (amountRub / 100).

Проверка:
- Оплатить через тестовую карту 1111 1111 1111 1026 (ЮKassa test)
- Через 10 сек увидеть активную подписку
````

---

# ФАЗА 4 — Сметчик-Студио MVP (2 недели) ⬜

> **Цель:** первый полностью рабочий Профи-пакет. Одиночный сметчик регистрируется → создаётся PERSONAL workspace → пользователь попадает на онбординг → выбирает роль «Сметчик» → видит преднастроенный UI только со Сметами → может оформить триал 14 дней или сразу купить Pro.

## Шаг 4.1 — Регистрация одиночки (Solo-signup) (День 1–2)

````
📋 ЗАДАЧА: Solo-регистрация без организации

Файлы:
- src/app/(auth)/signup/solo/page.tsx — форма регистрации одиночки
- src/app/api/auth/register-solo/route.ts

Форма:
- Email
- Пароль (валидация zxcvbn score >= 2)
- Фамилия, Имя
- (опционально) телефон
- Принятие оферты

Логика API-роута:
1. Проверить, что email уникален
2. Создать User
3. Создать PERSONAL Workspace (используя createPersonalWorkspace из Фазы 1)
4. Не создавать Organization
5. NextAuth sign-in автоматически (credentials callback)
6. Redirect на /onboarding/role

ВАЖНО: отличается от обычного /signup (который создаёт организацию)
Разделение:
- /signup        → для компаний (Organization + Workspace COMPANY)
- /signup/solo   → для одиночек (только Workspace PERSONAL)

Лендинг komplid.ru должен иметь оба CTA:
- «Зарегистрировать компанию» → /signup
- «Попробовать как специалист» → /signup/solo
````

---

## Шаг 4.2 — Онбординг: выбор роли (День 3)

````
📋 ЗАДАЧА: Онбординг-wizard для PERSONAL workspace

Файлы:
- src/app/(dashboard)/onboarding/role/page.tsx
- src/app/(dashboard)/onboarding/profile/page.tsx
- src/app/(dashboard)/onboarding/plan/page.tsx
- src/components/onboarding/RoleSelector.tsx
- src/app/api/users/me/onboarding/route.ts

Step 1 (/onboarding/role):
Заголовок: «Кто вы?»
Подзаголовок: «Мы настроим интерфейс под ваши задачи»
7 карточек (ProfessionalRole):
  - Сметчик / ПЭО
  - ПТО-инженер
  - Прораб / мастер СМР
  - Инженер СК / технадзор
  - Снабженец / закупщик
  - Руководитель проекта / ГИП
  - Бухгалтер строительства
Нажал карточку → PATCH /users/me { professionalRole: 'SMETCHIK' }
→ redirect на /onboarding/plan

Step 2 (/onboarding/plan):
Показывает 2 подходящие подписки: Basic и Pro для выбранной роли
(фильтр SubscriptionPlan by targetRole)
Сверху предложение бесплатного 14-дневного триала Pro
Кнопки: «Начать триал» | «Купить Basic» | «Купить Pro» | «Пока бесплатно»
  - Триал: создаёт Subscription(status=TRIAL, trialEnd=+14дней), activeSubscription устанавливается
  - Купить: redirect /settings/subscription/checkout/[planId]
  - Бесплатно: остаётся FREE, redirect /

Middleware:
- Если user.professionalRole IS NULL и workspace.type=PERSONAL
  и URL != /onboarding/*  → redirect /onboarding/role
- Это простая проверка в layout.tsx (dashboard)

Проверка:
- Новый solo-пользователь → попадает на /onboarding/role
- После выбора роли → /onboarding/plan
- После триала → / с работающим UI
````

---

## Шаг 4.3 — Ролевой UI-скин (День 4)

````
📋 ЗАДАЧА: Скрывать нерелевантные модули для PERSONAL + professionalRole

Файлы:
- src/lib/ui/role-modules.ts — маппинг «роль → видимые модули»
- src/components/layout/ObjectModuleSidebar.tsx — добавить фильтрацию
- src/components/layout/MainSidebar.tsx — добавить фильтрацию

role-modules.ts:
```typescript
import type { ProfessionalRole } from '@prisma/client';

export const ROLE_VISIBLE_MODULES: Record<ProfessionalRole, string[]> = {
  SMETCHIK: ['info', 'management', 'estimates', 'reports', 'archive'],
  PTO: ['info', 'management', 'journals', 'id', 'sk', 'reports', 'archive'],
  FOREMAN: ['info', 'journals', 'sk', 'resources', 'reports'],
  SK_INSPECTOR: ['info', 'sk', 'journals', 'reports', 'archive'],
  SUPPLIER: ['info', 'resources', 'management', 'reports'],
  PROJECT_MANAGER: ['info', 'management', 'pir', 'estimates', 'gantt',
                    'resources', 'reports', 'sk', 'id', 'bim', 'archive'],
  ACCOUNTANT: ['info', 'management', 'id', 'reports', 'archive'],
};

export function isModuleVisibleForRole(
  moduleKey: string,
  role: ProfessionalRole | null,
  workspaceType: 'PERSONAL' | 'COMPANY'
): boolean {
  // COMPANY — всё видно (решает организация)
  if (workspaceType === 'COMPANY') return true;
  // PERSONAL без роли — всё видно (не сломать UX)
  if (!role) return true;
  // PERSONAL с ролью — фильтр
  return ROLE_VISIBLE_MODULES[role]?.includes(moduleKey) ?? false;
}
```

В ObjectModuleSidebar.tsx — обернуть каждый пункт:
```tsx
{MODULES.filter(m => isModuleVisibleForRole(m.key, user.professionalRole, ws.type))
        .map(m => <SidebarItem ... />)}
```

В шапке UI — переключатель «Показать все модули» (toggle) для «пробника смежных возможностей».
Хранить в localStorage: showAllModules=true → не фильтровать.

Проверка:
- Solo Сметчик видит: Инфо, Управление, Сметы, Отчёты, Архив
- Solo Прораб видит: Инфо, Журналы, СК, Ресурсы, Отчёты
- COMPANY user видит всё без изменений
````

---

## Шаг 4.4 — Публичные ссылки на сравнение смет (День 5–7)

Это **главная виральная фича** Сметчик-Студио — сметчик делится сметой с подрядчиком по ссылке, тот смотрит без регистрации.

````
📋 ЗАДАЧА: Публичные read-only ссылки на смету и сравнение версий

Файлы Prisma:
- Добавить в EstimateVersion:
  publicShareToken String? @unique  // nanoid(24)
  publicShareMode  String?           // "VIEW" | "COMPARE"
  publicCompareWithVersionId String?
  publicShareExpiresAt DateTime?
  publicShareViewCount Int @default(0)

Миграция:
npx prisma migrate dev --name add_estimate_public_share

API:
- POST /api/projects/[pid]/estimates/[eid]/share
  Body: { mode: 'VIEW' | 'COMPARE', compareWithId?, expiresInDays? }
  Защита: requireFeature(FEATURES.ESTIMATES_PUBLIC_LINK)
  Генерирует nanoid(24), возвращает { url: `/shared/estimate/${token}` }

- DELETE /api/projects/[pid]/estimates/[eid]/share
  Отозвать ссылку

- GET /api/public/estimate/[token]
  Без auth, но с rate-limit (Upstash Redis: 100 req/min per token)
  Возвращает данные сметы (read-only)
  Инкрементирует publicShareViewCount
  Проверяет expires

UI:
- src/app/shared/estimate/[token]/page.tsx
  Минималистичный дизайн: логотип StroyDocs + Komplid, смета, CTA
  «Хотите такой же инструмент? Попробовать бесплатно →» (UTM source=share)

- Кнопка «Поделиться» в смете:
  /src/components/estimates/ShareEstimateDialog.tsx
  Выбор режима (VIEW / COMPARE), срок (1 день / 7 / 30 / бессрочно),
  кнопка «Скопировать ссылку»

Проверка:
- Создать смету, поделиться по ссылке
- Открыть ссылку в incognito — увидеть смету без login
- Счётчик publicShareViewCount растёт
- Отозвать ссылку — 404

Метрики:
- Сколько ссылок создаётся / активных
- Средняя конверсия viewер → регистрация (через UTM)
````

---

## Шаг 4.5 — Триал-автоматика и апгрейды (День 8–10)

````
📋 ЗАДАЧА: Cron для управления жизненным циклом подписок

Файлы:
- src/jobs/subscription-lifecycle.ts
- src/app/api/cron/subscription-lifecycle/route.ts (триггер через Vercel Cron или BullMQ)

Задачи cron (раз в час):
1. Триал заканчивается через 3 дня → уведомление
2. Триал закончился → status TRIAL → EXPIRED, workspace.activeSubscription=NULL
   (или автосписание если карта сохранена)
3. Subscription истекает завтра → уведомление
4. Subscription.status=ACTIVE, currentPeriodEnd в прошлом:
   a. Есть yookassaSubscriptionId → попытка автосписания
   b. Успех → новый Payment, новый period
   c. Неуспех → status=PAST_DUE, уведомить пользователя, grace period 7 дней
5. status=PAST_DUE, grace period истёк → status=EXPIRED
6. status=CANCELED, currentPeriodEnd в прошлом → status=EXPIRED

Uведомления: через Notification-модель + email
Шаблон email: templates/email/subscription-trial-ending.hbs и т.д.

Триггер:
- vercel.json → crons: { path: "/api/cron/subscription-lifecycle", schedule: "0 * * * *" }
- Защита Bearer-токеном CRON_SECRET (уже есть в проекте)

Проверка:
- Написать unit-тест c моком даты (vitest + timers)
- Создать Sub в TRIAL с trialEnd в прошлом → запустить cron → status EXPIRED
````

---

# ФАЗА 5 — Реферальная программа 2.0 (1 неделя) ⬜

## Шаг 5.1 — Prisma-модели рефералов (День 1)

```prisma
/// Реферальный код пользователя
model ReferralCode {
  id         String @id @default(uuid())
  code       String @unique                // base62, 8–12 символов
  userId     String @unique
  user       User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  clickCount Int    @default(0)            // переходов по ссылке
  signupCount Int   @default(0)            // регистраций
  paidCount  Int    @default(0)            // приведённых, которые заплатили

  createdAt  DateTime @default(now())

  referrals  Referral[]

  @@map("referral_codes")
}

/// Фактический реферал — связь реферера и приглашённого
model Referral {
  id         String @id @default(uuid())

  codeId     String
  code       ReferralCode @relation(fields: [codeId], references: [id])

  referrerId String
  referrer   User   @relation("ReferralReferrer", fields: [referrerId], references: [id])

  referredUserId String?  // NULL до регистрации
  referredUser   User?    @relation("ReferralReferred", fields: [referredUserId], references: [id])

  // Данные для расчёта бонуса
  referrerRole   ProfessionalRole?           // snapshot на момент регистрации
  referredRole   ProfessionalRole?
  isCrossRole    Boolean @default(false)     // реферер и приглашённый — разные роли

  // Сторона приглашённого
  signupAt   DateTime?
  firstPaidAt DateTime?
  firstPaymentAmountRub Int?
  firstPaymentId String?

  // Награда реферера
  rewardType             RewardType?          // CREDIT | CASHBACK
  rewardAmountRub        Int      @default(0)
  rewardStatus           RewardStatus @default(PENDING)
  rewardGrantedAt        DateTime?

  // Скидка приглашённого
  discountAmountRub      Int      @default(0)
  discountApplied        Boolean  @default(false)

  // Anti-fraud
  clickIp                String?
  clickUserAgent         String?
  signupIp               String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  payments  Payment[]  // платежи, использовавшие этот реферал

  @@index([referrerId])
  @@index([referredUserId])
  @@index([rewardStatus])
  @@map("referrals")
}

enum RewardType {
  CREDIT       // кредит на аккаунт (Фаза 1)
  CASHBACK     // денежная выплата (Фаза 2, после 10+ рефералов)
}

enum RewardStatus {
  PENDING      // ждёт первой оплаты приглашённого
  GRANTED      // выдана как credit на workspace
  PAID         // выплачена деньгами (cashback)
  CANCELED     // отменена (фрод / возврат)
}

/// Кредитный баланс workspace (для реферальных бонусов)
model WorkspaceCredit {
  id          String @id @default(uuid())
  workspaceId String @unique
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  balanceRub  Int    @default(0)            // текущий баланс в копейках

  ledger      CreditLedgerEntry[]

  updatedAt   DateTime @updatedAt

  @@map("workspace_credits")
}

model CreditLedgerEntry {
  id          String @id @default(uuid())
  creditId    String
  credit      WorkspaceCredit @relation(fields: [creditId], references: [id], onDelete: Cascade)

  amountRub   Int                            // + начисление, - списание
  type        LedgerEntryType
  description String

  // Ссылка на источник
  referralId  String?
  paymentId   String?

  createdAt   DateTime @default(now())

  @@index([creditId])
  @@map("credit_ledger_entries")
}

enum LedgerEntryType {
  REFERRAL_BONUS     // +
  PAYMENT_DEDUCTION  // - при оплате
  MANUAL_ADJUSTMENT  // + или - админом
  REFUND             // + возврат
}
```

Связи:
```prisma
// В User:
referralCode           ReferralCode?
referralsAsReferrer    Referral[] @relation("ReferralReferrer")
referralsAsReferred    Referral[] @relation("ReferralReferred")

// В Workspace:
credit                 WorkspaceCredit?
```

Команда:
```
📋 ЗАДАЧА: Добавить prisma-модели реферальной программы 2.0

Добавить enum: RewardType, RewardStatus, LedgerEntryType
Добавить модели: ReferralCode, Referral, WorkspaceCredit, CreditLedgerEntry
Связи в User, Workspace, Payment (referralId уже есть из Фазы 2)

npx prisma migrate dev --name add_referrals_v2
npx prisma generate
```

---

## Шаг 5.2 — Генерация реферальных кодов и трекинг (День 2)

````
📋 ЗАДАЧА: Автоматическая генерация кода + трекинг переходов

Файлы:
- src/lib/referrals/generate-code.ts
- src/app/api/referrals/me/route.ts (GET — мой код, POST — создать)
- src/app/api/referrals/track/route.ts (публичный — трек клика)
- src/app/(marketing)/ref/[code]/page.tsx — приземление переходов

generate-code.ts:
```typescript
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('0123456789ABCDEFGHJKLMNPQRSTUVWXYZ', 10);

export async function ensureReferralCode(userId: string): Promise<string> {
  const existing = await db.referralCode.findUnique({ where: { userId } });
  if (existing) return existing.code;

  let code = '';
  let attempts = 0;
  while (attempts < 5) {
    code = nanoid();
    const exists = await db.referralCode.findUnique({ where: { code } });
    if (!exists) break;
    attempts++;
  }

  await db.referralCode.create({ data: { userId, code } });
  return code;
}
```

/ref/[code]/page.tsx — серверный компонент:
```typescript
export default async function RefLanding({ params }: { params: { code: string } }) {
  const refCode = await db.referralCode.findUnique({
    where: { code: params.code },
    include: { user: { select: { firstName: true, lastName: true, professionalRole: true } } }
  });
  if (!refCode) redirect('/');

  // Инкрементировать clickCount
  await db.referralCode.update({
    where: { id: refCode.id },
    data: { clickCount: { increment: 1 } }
  });

  // Создать Referral с NULL referredUserId (заполнится при регистрации)
  // и поставить cookie с кодом на 30 дней

  return <RefLandingPage referrer={refCode.user} code={refCode.code} />;
}
```

UI приземления:
- «Привет! Вас пригласил [Имя Фамилия], сметчик»
- «Получите 30% скидки на первый месяц»  (если same-role)
- «Получите 40% скидки на первый месяц»  (если cross-role)
- CTA: «Зарегистрироваться бесплатно»
- Cookie: ref_code=XYZ, 30 дней

При регистрации — если cookie есть, в register-solo/route.ts:
1. Найти ReferralCode по code
2. Создать Referral(codeId, referrerId, referredUserId=newUser.id, signupAt=now, signupIp, ...)
3. Инкрементировать signupCount

Проверка:
- Переход /ref/ABC123 → cookie установлена, clickCount++
- Регистрация по ссылке → Referral создан, signupCount++
````

---

## Шаг 5.3 — Расчёт бонусов и кросс-ролевой ×-множитель (День 3)

````
📋 ЗАДАЧА: Процессор реферальных наград

Файлы:
- src/lib/referrals/calculate-reward.ts
- src/lib/referrals/process-referral-payment.ts

calculate-reward.ts — единственный источник истины по бонусам:
```typescript
import type { ProfessionalRole } from '@prisma/client';

interface CalcInput {
  referrerRole: ProfessionalRole | null;
  referredRole: ProfessionalRole | null;
  firstPaymentAmountRub: number;  // в копейках
}

interface CalcOutput {
  isCrossRole: boolean;
  referrerCreditRub: number;       // начисление в кредит реферера
  referredDiscountRub: number;     // скидка приглашённому на первый платёж
}

/// Правила Фазы 1 (подтверждены клиентом):
/// Та же роль:    реферер 50% / приглашённый 30%
/// Разная роль:   реферер 90% / приглашённый 40%
export function calculateReferralReward(input: CalcInput): CalcOutput {
  const isCrossRole =
    input.referrerRole !== null &&
    input.referredRole !== null &&
    input.referrerRole !== input.referredRole;

  const referrerPercent  = isCrossRole ? 0.90 : 0.50;
  const referredPercent  = isCrossRole ? 0.40 : 0.30;

  return {
    isCrossRole,
    referrerCreditRub: Math.floor(input.firstPaymentAmountRub * referrerPercent),
    referredDiscountRub: Math.floor(input.firstPaymentAmountRub * referredPercent),
  };
}
```

process-referral-payment.ts — вызывается из webhook ЮKassa при payment.succeeded:
```typescript
export async function processReferralReward(
  tx: Prisma.TransactionClient,
  payment: Payment
): Promise<void> {
  if (!payment.referralId) return;

  const referral = await tx.referral.findUnique({
    where: { id: payment.referralId },
    include: { referrer: true }
  });
  if (!referral) return;
  if (referral.firstPaidAt) return;  // уже обработан

  // Это первая оплата приглашённого — начисляем бонусы
  const reward = calculateReferralReward({
    referrerRole: referral.referrerRole,
    referredRole: referral.referredRole,
    firstPaymentAmountRub: payment.amountRub,
  });

  // 1. Запишем firstPaid в Referral
  await tx.referral.update({
    where: { id: referral.id },
    data: {
      firstPaidAt: new Date(),
      firstPaymentAmountRub: payment.amountRub,
      firstPaymentId: payment.id,
      rewardType: 'CREDIT',
      rewardAmountRub: reward.referrerCreditRub,
      rewardStatus: 'GRANTED',
      rewardGrantedAt: new Date(),
      isCrossRole: reward.isCrossRole,
    }
  });

  // 2. Увеличим paidCount реферального кода
  await tx.referralCode.update({
    where: { id: referral.codeId },
    data: { paidCount: { increment: 1 } }
  });

  // 3. Начислим кредит в PERSONAL workspace реферера
  const referrerPersonalWs = await tx.workspace.findFirst({
    where: { ownerId: referral.referrerId, type: 'PERSONAL' }
  });

  if (referrerPersonalWs) {
    await tx.workspaceCredit.upsert({
      where: { workspaceId: referrerPersonalWs.id },
      create: {
        workspaceId: referrerPersonalWs.id,
        balanceRub: reward.referrerCreditRub,
      },
      update: {
        balanceRub: { increment: reward.referrerCreditRub }
      }
    });

    const credit = await tx.workspaceCredit.findUnique({
      where: { workspaceId: referrerPersonalWs.id }
    });

    await tx.creditLedgerEntry.create({
      data: {
        creditId: credit!.id,
        amountRub: reward.referrerCreditRub,
        type: 'REFERRAL_BONUS',
        description: `Реферальный бонус: приглашённый ${referral.referredRole ?? '?'} оплатил подписку` +
                     (reward.isCrossRole ? ' (кросс-роль: ×90%)' : ' (×50%)'),
        referralId: referral.id,
        paymentId: payment.id,
      }
    });
  }

  // 4. Отправить уведомление рефереру
  await tx.notification.create({
    data: {
      userId: referral.referrerId,
      type: 'REFERRAL_REWARD',
      title: `Вам начислено ${reward.referrerCreditRub / 100} ₽`,
      message: `Ваш реферал оформил подписку. Бонус зачислен на ваш Личный workspace.`,
    }
  });
}
```

Применение скидки приглашённому — в checkout/route.ts:
```typescript
// Если пользователь пришёл по реф-коду и это его первая подписка:
const referral = await db.referral.findFirst({
  where: { referredUserId: userId, firstPaidAt: null }
});
if (referral) {
  const planAmount = billingPeriod === 'YEARLY' ? plan.priceYearlyRub : plan.priceMonthlyRub;
  const reward = calculateReferralReward({
    referrerRole: referral.referrerRole,
    referredRole: user.professionalRole,
    firstPaymentAmountRub: planAmount,
  });

  // Обновим referral для сохранения snapshot'а ролей
  await db.referral.update({
    where: { id: referral.id },
    data: {
      referredRole: user.professionalRole,
      discountAmountRub: reward.referredDiscountRub,
      discountApplied: true,
    }
  });

  finalAmount = planAmount - reward.referredDiscountRub;
  // передаём referralId в createPayment
}
```

Unit-тесты calculate-reward:
- Сметчик → Сметчик, 2900 ₽ → reward 1450₽, discount 870₽
- Сметчик → Прораб, 1900 ₽ → reward 1710₽, discount 760₽
- NULL → NULL → not cross-role, applies 50/30
````

---

## Шаг 5.4 — Страница реферальной программы + лидерборд (День 4–5)

````
📋 ЗАДАЧА: UI реферальной программы

Файлы:
- src/app/(dashboard)/referrals/page.tsx
- src/app/(dashboard)/referrals/leaderboard/page.tsx
- src/components/referrals/MyReferralCard.tsx
- src/components/referrals/ReferralsList.tsx
- src/components/referrals/CrossRoleExplainer.tsx
- src/components/referrals/LeaderboardTable.tsx

MyReferralCard:
┌─────────────────────────────────────────┐
│ Ваш реферальный код                    │
│                                         │
│  STROYxyz123                           │
│  [Копировать ссылку]                    │
│                                         │
│  komplid.ru/ref/STROYxyz123             │
│                                         │
│  Статистика:                           │
│  • 14 переходов  • 5 регистраций        │
│  • 2 платящих  • 2 630 ₽ бонусов        │
│                                         │
│  [Показать мои приглашения →]           │
└─────────────────────────────────────────┘

CrossRoleExplainer (важный educational блок):
┌────────────────────────────────────────────┐
│ 💡 Приведите коллегу из ДРУГОЙ профессии — │
│    получите ×-бонус                         │
│                                            │
│  Вы сметчик, приглашаете:                  │
│                                            │
│  ✓ Другого сметчика  → 50% / 30%           │
│  🚀 Прораба или ПТО  → 90% / 40%           │
│                                            │
│  Пример: пригласили ПТО с Pro за 2 900 ₽   │
│  → вам 2 610 ₽ на счёт, ему 1 160 ₽ скидка │
└────────────────────────────────────────────┘

ReferralsList — таблица:
| Email | Роль | Статус | Дата регистрации | Дата оплаты | Бонус |
| .....@ | ПТО  | ✓оплачен | 10.05 | 12.05 | 2 610 ₽ |
| .....@ | Сметч | в триале | 15.05 | — | — (ожидание) |

Leaderboard (публичный для всех users):
| # | Имя  | Роль | Рефералов | Бонусов (общие, без точных сумм) |
| 1 | Василий К. | Сметчик | 23  | 🏆 Супер-партнёр |
| 2 | Ирина П.   | ПТО      | 14  | 🥈 Активный |
...
Согласие на публикацию: чекбокс в profile settings.

Виджет «Поделиться»:
- Кнопка «WhatsApp», «Telegram», «Email» с преднастроенным текстом
- Шаблон: «Привет! Я использую StroyDocs для ведения смет — рекомендую. По моей ссылке -30% на первый месяц: {link}»

Проверка:
- Зайти на /referrals — видеть свой код
- Копировать, открыть в incognito
- Зарегистрироваться → увидеть себя в ReferralsList реферера
- После оплаты — увидеть бонус в реальном времени
````

---

## Шаг 5.5 — Anti-fraud и мониторинг (День 6–7)

````
📋 ЗАДАЧА: Защита от злоупотреблений реферальной программой

Файлы:
- src/lib/referrals/anti-fraud.ts
- src/jobs/referral-fraud-scan.ts
- src/app/admin/referrals/page.tsx (для админа)

Проверки в anti-fraud.ts:
1. Один IP — максимум 3 signup'а за 7 дней
2. Email-домены не должны совпадать у реферера и приглашённого (реферер ivan@gmail.com не может привести ivan2@gmail.com, вероятен селф-реферал)
   Исключение: корпоративные домены из whitelist
3. Географическая проверка: IP referrer и referred не должны быть из одной /24 подсети
4. Время между signup и firstPaid >= 10 минут (отсечь ботов)
5. После GRANTED — платёж не должен быть возвращён в течение 30 дней (иначе отмена бонуса)
6. Лимит: максимум 10 GRANTED рефералов в месяц от одного реферера
   При превышении — нужна ручная модерация

Флаги в Referral.metadata:
- suspicious: boolean
- fraudReasons: string[]

Админ-страница (/admin/referrals):
- Список подозрительных рефералов
- Действия: «Подтвердить», «Отклонить (CANCELED + списать credit)»
- Логирование всех действий

Cron scan (раз в час):
- Проверяет все рефералы за последние 24ч
- Помечает подозрительные
- Отсылает отчёт админам

Возвраты: при refund payment → если связанный referral уже GRANTED, создать
отрицательный CreditLedgerEntry, уведомить админа.

Проверка:
- Создать 2 signup с одного IP быстро → 2-й должен быть помечен suspicious
- Админ может отклонить → бонус списывается
````

---

# ФАЗА 6 — ИД-Мастер (2 недели) ⬜

> Повторяет паттерн Сметчик-Студио, используя feature-gate и роль PTO.

## Шаг 6.1 — Новые фичи в Модуле 10 (День 1–4)

````
📋 ЗАДАЧА: Подготовить Модуль 10 к B2C-режиму

Доработки, необходимые для Профи-пакета:
1. Библиотека 50+ шаблонов АОСР по видам работ (из КСИ)
   - Seed: prisma/seeds/aosr-templates.ts
   - Каждый шаблон = .docx файл в S3 + запись в DocumentTemplate
   - Категории: земляные, бетонные, монтажные, кровельные, отделочные...

2. Автогенерация АОСР из сметы одной кнопкой (feature-gate: AOSR_GENERATION)
   - В /estimates/[id]/items — добавить кнопку «Создать АОСР для позиции»
   - Новый API POST /api/estimate-items/[id]/generate-aosr
   - Предзаполняет: наименование работы, объём, единица из EstimateItem

3. Упрощённый wizard создания АОСР для solo-пользователя
   - 3 шага: выбор шаблона → участники (упрощённо: одна организация) → данные работ
   - В PERSONAL workspace скрывать поля «автонадзор», «технадзор» (опциональны)

4. Онлайн-подписание по публичной ссылке (как у смет)
   - POST /api/execution-docs/[id]/share
   - GET /shared/execution-doc/[token] — просмотр + кнопка «Подписать»
     (для гостевой подписи — отдельный flow, не требует регистрации)

Файлы:
- prisma/seeds/aosr-templates.ts — массив TEMPLATES с workType, name, docxS3Key
- src/app/api/estimate-items/[id]/generate-aosr/route.ts
- src/components/id/CreateAosrWizard.tsx (3 шага для PERSONAL)
- src/app/api/execution-docs/[id]/share/route.ts
- src/app/shared/execution-doc/[token]/page.tsx
````

---

## Шаг 6.2 — ИД-Мастер checkout и онбординг PTO (День 5)

````
📋 ЗАДАЧА: Онбординг ПТО-инженера

По аналогии с Фазой 4.2, но для роли PTO:
1. /signup/solo → онбординг /role → выбирает «ПТО-инженер»
2. /onboarding/plan показывает id_master_basic / id_master_pro
3. Триал 14 дней / Basic / Pro / FREE

Особенности UI:
- Sidebar видит: Инфо, Управление, Журналы, ИД, СК, Отчёты, Архив
- Дашборд: «Сделано АОСР за месяц», «% согласованных», «В работе»
- Onboarding-tutorial: «Создайте первый АОСР за 5 минут»
- Шаблоны: автоматически доступна библиотека 50 АОСР

Валидация:
- UI тестируется тем же путём что Сметчик-Студио
````

---

# ФАЗА 7 — Прораб-Журнал + PWA (2 недели) ⬜

> Главная сложность — мобильность. Этот пакет почти не имеет смысла без PWA.

## Шаг 7.1 — PWA доработки Модуля 16 (День 1–5)

````
📋 ЗАДАЧА: Mobile-first UI для прораба

Файлы:
- src/app/mobile/page.tsx — layout для мобильных (< 768px)
- src/components/mobile/MobileShell.tsx — bottom-tab nav
- src/components/mobile/QuickJournalEntry.tsx
- src/components/mobile/QuickDefect.tsx
- src/components/mobile/QuickPhoto.tsx

Bottom tab nav для Прораб-Журнал (3 экрана):
- «Журнал» (Journals)
- «Фото» (Photos with GPS)
- «Замечание» (Defect)
Опционально 4-й: «Объект» (info)

QuickJournalEntry:
- Textarea «Что сделали» (голосовой ввод)
- Автокомпиляция погоды и даты (geolocation + openweathermap API)
- Кнопка «Сохранить»
- Офлайн-очередь (IndexedDB через idb)

QuickPhoto:
- Открывает камеру (input type=file accept=image/* capture=camera)
- Автоматически сохраняет GPS (geolocation)
- Предпросмотр + аннотации (canvas)
- Привязка к объекту и журналу

QuickDefect:
- Фото + описание + срок устранения
- Отправляется подрядчику (опционально — по email)

Офлайн-синхронизация:
- Service Worker: все POST в очередь при offline
- При возвращении online — background sync API
- Конфликт-резолюция: последняя запись побеждает

Feature-gate:
- QuickJournalEntry → MOBILE_PWA
- Voice input → VOICE_INPUT (Pro)
- Аннотации → PHOTOS_ANNOTATIONS (Pro)
- Offline → MOBILE_OFFLINE (Pro)
````

---

## Шаг 7.2 — Голосовой ввод (Yandex SpeechKit) (День 6–8)

````
📋 ЗАДАЧА: Voice-to-text для записей ОЖР

Файлы:
- src/lib/voice/yandex-speechkit.ts — клиент
- src/components/mobile/VoiceRecorder.tsx
- src/app/api/voice/transcribe/route.ts

Yandex SpeechKit:
- npm install @aws-sdk/client-transcribe-streaming (альтернатива)
- Или Yandex Cloud SpeechKit v3 REST API

Flow:
1. Юзер жмёт микрофон → MediaRecorder records 16kHz PCM
2. При стопе — blob отправляется на /api/voice/transcribe
3. Сервер вызывает Yandex SpeechKit
4. Возвращает текст → вставляется в textarea
5. Пользователь редактирует перед сохранением

Feature-gate: VOICE_INPUT (только Pro)

env:
YANDEX_SPEECHKIT_API_KEY=
YANDEX_FOLDER_ID=

Проверка:
- Надиктовать запись — получить текст
- Время обработки <3s для 10-секундной записи
````

---

## Шаг 7.3 — Связующее звено с ПТО (виральность) (День 9–10)

````
📋 ЗАДАЧА: Экспорт ОЖР в ИД-Мастер подрядчика

Логика:
Прораб ведёт ОЖР с телефона.
В конце месяца — кнопка «Отправить в ПТО».
Генерируется email с ссылкой: komplid.ru/shared/journal/[token]
ПТО открывает — видит журнал, может:
  1. Скачать PDF
  2. «Использовать для генерации АОСР» — если ПТО зарегистрирован
     → автозаполнение АОСР из записей журнала

Если ПТО не зарегистрирован:
  «Откройте профессиональную подписку ИД-Мастер — генерируйте АОСР из этого
   журнала автоматически. Попробовать 14 дней бесплатно →»

Это главный виральный мост: Прораб → ПТО → купил ИД-Мастер → в следующем проекте
может стать реферером Прораба другой бригады.

Файлы:
- src/app/api/journals/[id]/share/route.ts
- src/app/shared/journal/[token]/page.tsx
- src/components/journals/ShareToPTODialog.tsx
````

---

# ФАЗА 8 — Tilda + маркетинг (1 неделя) ⬜

## Шаг 8.1 — Tilda-лендинги профи (День 1–3)

````
📋 ЗАДАЧА: 3 отдельных раздела на Komplid-лендинге

URLs:
- komplid.ru/smetchik — Сметчик-Студио
- komplid.ru/pto — ИД-Мастер
- komplid.ru/prorab — Прораб-Журнал

Структура страницы (каждая):
1. Hero: «Вы [роль]? У нас инструмент именно для вас»
2. 3 главные задачи, которые решает пакет
3. Скриншоты UI (Figma/реальные)
4. «Попробовать 14 дней бесплатно» → /signup/solo?ref=tilda_smetchik
5. 3 тарифа: FREE, Basic, Pro
6. Отзывы (кейсы-заготовки)
7. FAQ
8. Сравнение с конкурентами (Гранд-Смета, бумажный ОЖР, ручной Word)

UTM на всех кнопках:
?utm_source=tilda&utm_medium=landing&utm_campaign=smetchik

В /signup/solo парсить UTM и сохранять в User.utmSource (новое поле).

SEO:
- Ключевые фразы: «сметчик онлайн», «сравнение смет», «АОСР скачать шаблон»,
  «бесплатный ОЖР», «электронный журнал работ»
- Robots.txt, sitemap.xml
- Schema.org/SoftwareApplication

Блог Tilda:
- 10 SEO-статей на старт (по 3 на каждый пакет + 1 общая)
- Примеры статей:
  - «Как сравнить две сметы за 3 клика»
  - «Шаблон АОСР по приказу №344/пр: скачать и заполнить»
  - «ОЖР с телефона: пошаговая инструкция»
````

---

## Шаг 8.2 — Tilda webhook → оплата (День 4–5)

````
📋 ЗАДАЧА: Alternative payment канал через Tilda-форму

Файлы:
- src/app/api/webhooks/tilda/route.ts

Flow:
1. Пользователь на Tilda нажимает «Купить Pro»
2. Tilda-форма: email, имя, тариф
3. Tilda обрабатывает оплату через свой ЮKassa или сразу редиректит на виджет
4. Webhook POST /api/webhooks/tilda
5. Сервер создаёт User (если нет), PERSONAL Workspace, Subscription, Payment(source=TILDA)
6. Отправляет welcome-email с логином/паролем
7. Пользователь логинится и сразу видит свою Pro подписку

Это важно для пользователей, кто не хочет регистрироваться перед оплатой.

Защита webhook:
- Bearer-токен TILDA_WEBHOOK_SECRET
- Allow-list IP Tilda

Синхронизация с оф-лайн:
- Обе схемы (App + Tilda) пишут в Payment, поле source различает
- SubscriptionPlan один и тот же
- Единая история в UI /settings/subscription
````

---

## Шаг 8.3 — Дашборд метрик для админа (День 6–7)

````
📋 ЗАДАЧА: Admin-дашборд метрик B2C

Файлы:
- src/app/admin/metrics/page.tsx
- src/app/api/admin/metrics/route.ts

Метрики (обновление каждые 5 минут, кэш Redis):
- MRR (Monthly Recurring Revenue) по типам планов
- Количество активных подписок (TRIAL / ACTIVE / PAST_DUE)
- Churn за последние 30 дней
- Воронка: посетители Tilda → регистрации → триалы → оплаты
- Реферальная эффективность: доля платящих, пришедших через рефералы
- Топ рефереров (с их paidCount)
- CAC по каналам (UTM-source разбивка)

Доступ: только role=ADMIN.

Визуализация: Recharts (уже в проекте для других модулей).
````

---

# Архитектурные замечания и best practices

## Безопасность

1. **Всегда** фильтровать по `workspaceId` из сессии во всех API (замена старого `organizationId`)
2. Pre-signed URL в S3 — TTL 1 час, никогда публичный доступ
3. Webhook роуты — Bearer-токен + IP allow-list
4. Публичные share-токены — nanoid(24), уникальные, отзываемые, с опциональным expiresAt
5. Anti-fraud: rate limit на регистрацию (5/час/IP), на публичные ссылки (100 req/min/token)

## Производительность

1. Все `findMany` на моделях Payment, Referral, Subscription — с пагинацией (take/skip)
2. Кэш `getActivePlan` в Redis (60 сек TTL) — выдерживает feature-check на каждом запросе
3. Индексы: `Subscription.status`, `Subscription.currentPeriodEnd`, `Payment.yookassaPaymentId`, `Referral.rewardStatus`

## Типизация

1. Все цены — `Int` в копейках
2. Feature keys — `FeatureKey` enum (src/lib/subscriptions/features.ts)
3. Limit keys — `LIMIT_KEYS` enum
4. ApiResponse<T> для всех эндпоинтов
5. Zod-схемы для всех входящих данных

## Миграция и откат

1. Каждая фаза — отдельный PR (reversible)
2. Workspace backfill — идемпотентный скрипт
3. Существующие B2B-клиенты не должны заметить изменений
4. Feature-flag для включения /signup/solo в проде — через env `ENABLE_SOLO_SIGNUP=true`

## Уведомления

Расширить существующую модель Notification новыми типами:
```typescript
type NotificationType =
  | 'REFERRAL_SIGNUP'           // кто-то зарегистрировался по вашей ссылке
  | 'REFERRAL_REWARD'           // вам начислен реферальный бонус
  | 'SUBSCRIPTION_TRIAL_ENDING' // триал заканчивается через N дней
  | 'SUBSCRIPTION_EXPIRED'
  | 'SUBSCRIPTION_RENEWED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REFUNDED'
  | 'FEATURE_UPGRADE_SUGGESTED' // автоматически при попытке использовать premium-feature
  | ...  // существующие
```

---

# Метрики успеха по фазам

| Фаза | Ключевая метрика | Целевое значение |
|------|-------------------|-------------------|
| 1 | Миграция без регрессий | 0 bug-reports от B2B-клиентов |
| 2 | Feature-gate покрытие | 100% платных фич Фазы 4 |
| 3 | Успешность оплат | >95% payment.succeeded |
| 4 | Конверсия Сметчик в триал | >5% от посещений /smetchik |
| 4 | Конверсия триал → Pro | >12% |
| 5 | Доля регистраций по реф-ссылке | >20% |
| 5 | Cross-role referrals | >30% от всех реф. |
| 6 | ИД-Мастер MRR за месяц | >150 000 ₽ |
| 7 | Прораб-Журнал DAU (daily active) | >60% от платящих |
| 8 | Tilda → signup конверсия | >3% |

---

# База данных (итоговая схема для Модуля 15)

**Новые модели:**
- `Workspace`, `WorkspaceMember`
- `SubscriptionPlan`, `Subscription`, `Payment`
- `ReferralCode`, `Referral`
- `WorkspaceCredit`, `CreditLedgerEntry`

**Новые enum:**
- `WorkspaceType`, `WorkspaceRole`, `PlanType`, `ProfessionalRole`
- `SubscriptionStatus`, `BillingPeriod`, `PaymentSource`, `PaymentStatus`
- `RewardType`, `RewardStatus`, `LedgerEntryType`

**Расширения существующих моделей:**
- `User.professionalRole`, `.utmSource`, реверс-связи
- `Organization.workspace` (опц.)
- `BuildingObject.workspaceId`, `EstimateVersion.workspaceId`, etc. (Этап миграции)

---

_Конец Модуля 15._
_Готово к передаче в разработку Claude Code по фазам._
