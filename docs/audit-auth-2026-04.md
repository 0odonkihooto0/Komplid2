# audit-auth-2026-04.md — Аудит системы Auth/Onboarding/Roles

> Дата: 2026-04-25  
> Цель: сверить текущее состояние кодовой базы с требованиями AUTH_ONBOARDING_ROLES_PLAN.md (Фаза A)  
> Репозиторий: `stroydocs/`

---

## 1. Prisma schema — enums и модели

| Объект | Статус | Что нужно в Фазе A2 |
|--------|--------|----------------------|
| `enum WorkspaceRole` | ⚠️ НЕПОЛНЫЙ | Есть: `OWNER, ADMIN, MEMBER, GUEST`. Нужно добавить: `MANAGER, FOREMAN, ENGINEER, WORKER, CUSTOMER` |
| `enum MemberStatus` | ❌ НЕТ | Создать: `ACTIVE, SUSPENDED, DEACTIVATED, LEFT` |
| `enum UserAccountType` | ❌ НЕТ | Создать: `INDIVIDUAL, SELF_EMPLOYED, ENTREPRENEUR, LEGAL_ENTITY, UNKNOWN` |
| `enum UserIntent` | ❌ НЕТ | Создать: `CONTRACTOR_GENERAL, CONTRACTOR_SUB, CONTRACTOR_INDIVIDUAL, ESTIMATOR, PTO_ENGINEER, CUSTOMER_PRIVATE, CUSTOMER_B2B, CONSTRUCTION_SUPERVISOR, UNKNOWN` |
| `enum FeatureCategory` | ❌ НЕТ | Создать: `CORE, B2C_SMETCHIK, B2C_PTO, B2C_PRORAB, B2C_CUSTOMER, B2B, AI, INTEGRATIONS, MARKETPLACE` |
| `model User` | ⚠️ ЧАСТИЧНЫЙ | **Есть:** id, email, passwordHash, firstName, lastName, middleName, phone, position, role, organizationId, activeWorkspaceId, professionalRole. **Нет:** `accountType, intent, fullName, inn, onboardingCompleted, onboardingStep, signupSource, referredByCode, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, firstTouchAt, signupIpHash, signupUserAgent` |
| `model Workspace` | ✅ ЕСТЬ | Полный набор полей из MODULE15 |
| `model WorkspaceMember` | ⚠️ МИНИМАЛЬНЫЙ | Есть: `id, workspaceId, userId, role, joinedAt`. Нет: `specialization, title, guestScope, invitedBy, invitedAt, acceptedAt, lastActiveAt, status, deactivatedAt, deactivationReason` |
| `model SubscriptionPlan` | ✅ ЕСТЬ | features хранятся как `Json @default("[]")` — список строковых ключей |
| `model SubscriptionFeature` | ❌ НЕТ | Создать нормализованную таблицу фичей |
| `model PlanFeature` | ❌ НЕТ | Создать связку plan↔feature |
| `model Subscription` | ✅ ЕСТЬ | Привязана к `workspaceId` ✅ |
| `model Referral` | ✅ ЕСТЬ | MODULE16 реализован: `Referral, ReferralCode` |
| `model ReferralReward` (отдельная) | ❌ НЕТ | Наград отдельной таблицы нет — `rewardAmountRub` inline в `Referral` |

---

## 2. src/lib/auth.ts — логика аутентификации

| Элемент | Статус | Примечание |
|---------|--------|------------|
| `requireRole()` функция | ❌ НЕТ | Нет централизованной проверки роли |
| `getCurrentWorkspace()` | ❌ НЕТ | Есть `getActiveWorkspaceOrThrow()` в `auth-utils.ts` |
| `getSessionOrThrow()` | ✅ ЕСТЬ | В `src/lib/auth-utils.ts` |
| `getOrganizationId()` | ✅ ЕСТЬ | В `src/lib/auth-utils.ts` |
| NextAuth версия | ✅ v4 (next-auth) | Plan упоминает Auth.js v5, но используется v4 |
| Провайдеры | ⚠️ только Credentials | Нет Google, Yandex, Sber ID |
| `session.user` состав | ⚠️ ЧАСТИЧНЫЙ | Есть: id, email, firstName, lastName, role, organizationId, activeWorkspaceId, professionalRole. Нет: `intent, accountType, onboardingCompleted` |

---

## 3. Auth pages — формы регистрации и входа

| Страница | Статус | Примечание |
|----------|--------|------------|
| `/login` | ✅ ЕСТЬ | `LoginForm.tsx` — email + password |
| `/register` | ✅ ЕСТЬ | Форма регистрации организации (orgName, INN, ФИО, email, phone, password) |
| `/register/solo` | ✅ ЕСТЬ | Форма одиночного специалиста → редирект `/onboarding/role` |
| `/signup` (из плана) | ❌ НЕТ | В плане `/signup?plan=...&intent=...&ref=...` — в коде называется `/register` |
| UTM-параметры (`utm_source` и др.) | ❌ НЕТ | Не читаются из query, не сохраняются в cookie |
| `?ref=CODE` обработка | ❌ НЕТ | Нет cookie `signupContext` |
| Preset-план при регистрации | ❌ НЕТ | Нет `?plan=smetchik_studio` логики |
| Социальный логин | ❌ НЕТ | Только Credentials |
| `signupContext` cookie | ❌ НЕТ | Нет `src/lib/tracking/signupContext.ts` |

---

## 4. src/app/api/auth/[...nextauth]/route.ts

| Элемент | Статус |
|---------|--------|
| Конфигурация | ✅ `NextAuth(authOptions)` — стандартная |
| Провайдеры | ⚠️ только CredentialsProvider |
| JWT callback | ✅ Корректный — пробрасывает id, role, organizationId, activeWorkspaceId, professionalRole |
| Session callback | ✅ Корректный |

---

## 5. Feature codes — текущее состояние

| Элемент | Статус | Примечание |
|---------|--------|------------|
| `src/lib/subscriptions/features.ts` | ✅ ЕСТЬ | `FEATURES` объект ~35 кодов в lowercase snake_case |
| `src/lib/features/codes.ts` | ❌ НЕТ | Нужно создать с UPPER_SNAKE_CASE реестром |
| `requireFeature()` | ✅ ЕСТЬ | В `src/lib/subscriptions/require-feature.ts` |
| `hasFeature()` | ✅ ЕСТЬ | В `src/lib/subscriptions/require-feature.ts` |
| `useFeature()` hook | ✅ ЕСТЬ | В `src/hooks/use-feature.ts` |
| Сырые строки вместо констант | ✅ НЕТ | Все usages через `FEATURES.XXX` — хорошо |
| B2C-коды из плана (SMETCHIK_STUDIO_ACCESS и др.) | ❌ НЕТ | Не зарегистрированы |
| Новые коды (GUEST_INVITATION, PUBLIC_DASHBOARD и др.) | ❌ НЕТ | Не зарегистрированы |

---

## 6. Онбординг-мастер

| Страница | Статус |
|----------|--------|
| `/onboarding/role` | ✅ ЕСТЬ | Выбор `ProfessionalRole` из enum |
| `/onboarding/plan` | ✅ ЕСТЬ | Выбор тарифа по роли |
| `/onboarding/workspace` | ❌ НЕТ (план B2.3) | Создание workspace в онбординге |
| `/onboarding/invite` | ❌ НЕТ (план B2.4) | Приглашение коллег |
| `/onboarding/first-project` | ❌ НЕТ (план B2.5) | Первый проект |
| `User.onboardingCompleted` | ❌ НЕТ | Поле не существует в schema |
| `User.onboardingStep` | ❌ НЕТ | Поле не существует в schema |

---

## 7. Матрица прав (для Фазы A3)

| Элемент | Статус |
|---------|--------|
| `src/lib/permissions/matrix.ts` | ❌ НЕТ |
| `src/lib/permissions/actions.ts` | ❌ НЕТ |
| `src/lib/permissions/check.ts` | ❌ НЕТ |
| Проверки роли в API endpoints | ⚠️ РАЗРОЗНЕННЫЕ | ad-hoc через `session.user.role !== 'OWNER'` |

---

## Итоговая сводка: Что есть / Чего нет / Что нужно доделать

### ✅ Уже реализовано и готово к использованию
- NextAuth v4 с CredentialsProvider — работает, JWT корректный
- `getSessionOrThrow()`, `getOrganizationId()`, `getActiveWorkspaceOrThrow()` в `auth-utils.ts`
- Базовый онбординг (`/onboarding/role`, `/onboarding/plan`)
- `WorkspaceRole` (базовые роли)
- Система подписок (MODULE15) — `SubscriptionPlan`, `Subscription`, `Workspace`
- Реферальная программа (MODULE16) — `ReferralCode`, `Referral`
- `requireFeature()` / `hasFeature()` / `useFeature()` — работают
- `src/lib/subscriptions/features.ts` — 35 feature-кодов с типами

### ⚠️ Есть, но нужно расширить (Фаза A2)
- `WorkspaceRole` enum — добавить MANAGER, FOREMAN, ENGINEER, WORKER, CUSTOMER
- `WorkspaceMember` — добавить все поля из плана
- `User` модель — добавить accountType, intent, onboarding*, utm_*, signupSource, referralCode (string), referredByCode
- `FEATURES` в `features.ts` — мигрировать в `src/lib/features/codes.ts` с добавлением B2C-кодов

### ❌ Нет, нужно создать
- **Фаза A1** (сейчас): `src/lib/features/codes.ts` с унифицированным реестром
- **Фаза A2**: enums `UserAccountType, UserIntent, MemberStatus, FeatureCategory`; модели `SubscriptionFeature, PlanFeature`
- **Фаза A3**: `src/lib/permissions/` — actions, matrix, check
- **Фаза B1**: context-aware регистрация (UTM, ref, preset-план)
- **Фаза B2**: остальные шаги онбординга, `User.onboardingCompleted`
- **Фаза C**: управление членами workspace через UI

### Именование: текущий стандарт vs. план
- Текущие feature-коды: `lowercase_snake_case` (например, `'aosr_generation'`)
- Plan требует: `UPPER_SNAKE_CASE` ключи и значения (например, `'AOSR_GENERATION'`)
- **Решение A1.2**: создать `src/lib/features/codes.ts` с двумя секциями:
  1. Новые B2C/B2B коды плана (UPPER_SNAKE_CASE)
  2. Все существующие коды (UPPER_SNAKE_CASE ключи, существующие lowercase значения для совместимости с БД)
  - `features.ts` остаётся, но импортирует из нового `codes.ts`
