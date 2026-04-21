# SUBSCRIPTION_SYSTEM.md — Спецификация системы подписок Komplid

> **Статус:** Надстройка над MODULE15_PLAN.md
> **Учёт:** Фазы 1-7 Модуля 15 ВЫПОЛНЕНЫ. Фаза 8 (Tilda) НЕ ВЫПОЛНЯЕТСЯ (заменена на komplid-marketing на Next.js 15)
> **Юрформа:** ИП на УСН «Доходы» 6%, освобождение от НДС (выручка < 20 млн ₽/год)
> **Цель:** Детально доработать три критических аспекта — ЮKassa интеграция, экономика тарифов, UI/UX биллинга
> **Дата:** Апрель 2026
> **Ориентир реализации:** 2-3 недели работы Claude Code поверх готовой инфраструктуры M15

---

## 0. Контекст и границы

### 0.1. Что уже сделано в Модуле 15 (фазы 1-7)

На момент создания этого документа в проекте реализовано:

**Workspace-абстракция (Фаза 1):**
- Модели `Workspace` (PERSONAL / COMPANY) и `WorkspaceMember`
- Фабрики `createPersonalWorkspace`, `createCompanyWorkspace`
- Миграция данных: `BuildingObject`, `EstimateVersion`, `ExecutionDoc` имеют `workspaceId`

**Базовые модели подписок (Фаза 2):**
- Модели `SubscriptionPlan`, `Subscription`, `Payment`
- Seed каталог тарифов Фазы 1 (Freemium / Basic / Pro / Team / Corporate)
- Middleware `checkSubscriptionLimits` — проверка лимитов перед мутациями
- Feature-gate через `useFeature()` React-хук и `<PaywallBanner>` компонент
- API `/api/subscriptions/active`, `/api/subscription-plans`

**Базовая ЮKassa интеграция (Фаза 3):**
- Клиент `lib/payments/yookassa-client.ts`
- Webhook `/api/webhooks/yookassa` — обработка `payment.succeeded`, `payment.canceled`
- Checkout UI с виджетом ЮKassa

**Сметчик-Студио MVP (Фаза 4):**
- Solo-signup поток `/signup/solo`
- Онбординг: выбор роли (Сметчик / ПТО / Прораб)
- Ролевой UI-скин — разные стартовые экраны
- Публичные ссылки на сравнение смет
- Триал-автоматика (14 дней)

**Реферальная программа 2.0 (Фаза 5):**
- Модели `ReferralCode`, `Referral`, `WorkspaceCredit`, `CreditLedgerEntry`
- Генерация base62 кодов
- Кросс-ролевой ×-множитель (50/30 в same-role, 90/40 в cross-role)
- Anti-fraud проверки, лидерборд

**ИД-Мастер MVP (Фаза 6):**
- Checkout и онбординг для роли ПТО
- Feature-flag доступ к модулю 10 (Исполнительная документация)

**Прораб-Журнал + PWA (Фаза 7):**
- PWA фичи из Модуля 16
- Голосовой ввод через Yandex SpeechKit
- Связующее звено с ПТО (виральность)

### 0.2. Что НЕ сделано и планируется в этом документе

Основная часть работы по ЮKassa была «базовая» — достаточная для MVP, но с критическими пробелами для production:

**Пробелы по ЮKassa (раздел 2):**
- Нет обработки ФЗ-54 чеков (штрафы ФНС 30 000 ₽/чек за отсутствие)
- Нет автоплатежей (рекуррентные списания) — каждый месяц нужно платить вручную
- Нет 3DS и fraud-protection
- Нет обработки всех 8 состояний платежа
- Нет возвратов (refunds) при отмене
- Не учтено **повышение комиссии ЮKassa на НДС 22% с 1 января 2026** (комиссия становится выше, но ИП на УСН сам НДС не платит)
- Не учтено **прекращение поддержки самозанятых с 29 декабря 2025** (для ИП это не проблема)

**Пробелы по экономике тарифов (раздел 3):**
- Не определены конкретные лимиты Freemium по ролям
- Нет логики **proration** (пересчёт при апгрейде среди периода)
- Нет логики **downgrade** (что делать с данными сверх нового лимита)
- Нет промо-кодов и скидок
- Нет годовых подписок с предоплатой
- Нет `SubscriptionEvent` (история изменений тарифа)
- Нет корректной логики отмены (immediate vs end-of-period)
- Нет dunning (серия напоминаний при отказе карты)

**Пробелы по UX (раздел 4):**
- Нет страницы `/settings/billing` (только базовый просмотр)
- Нет страницы смены тарифа с preview proration
- Нет истории платежей со скачиванием чеков
- Нет cancel flow с удержанием (retention offer)
- Нет email-уведомлений о платежах, отказах, продлениях
- Нет админ-страницы `/admin/billing` для управления подписками

### 0.3. Что ЭТОТ документ не охватывает

- Корпоративные договоры с юрлицами через счёт-фактуры (делаем отдельно для Enterprise-тарифа)
- Интеграция с МойСклад / 1С Бухгалтерия
- Маркетинговые акции и A/B тесты тарифов
- Churn-анализ и расчёт LTV/CAC (делаем в админ-дашборде М15 Фаза 8→не делаем→делаем в новом модуле)
- Налоговое резидентство и международные платежи

### 0.4. Налоговый режим: ИП на УСН «Доходы» 6% без НДС

Комплид запускается от имени **ИП на упрощённой системе налогообложения**, объект «Доходы», ставка 6%. Это определяет множество технических решений в системе биллинга.

#### 0.4.1. Ключевые особенности 2026 года

**С 1 января 2026 действуют новые правила для УСН** (ФЗ №425 от 28.11.2025):

| Показатель | Значение для ИП на УСН |
|---|---|
| Основной налог | 6% с доходов |
| Уменьшение на страховые взносы | до 100% без работников |
| **Порог освобождения от НДС в 2026** | **20 млн ₽/год** |
| Порог освобождения от НДС в 2027 | 15 млн ₽/год |
| Порог освобождения от НДС в 2028 | 10 млн ₽/год |
| Лимит применения УСН в 2026 | 490,5 млн ₽/год |

**Что это значит для Komplid:**

- Пока годовая выручка < 20 млн ₽ → **НДС не платим**, декларацию по НДС не сдаём, счета-фактуры с НДС не выставляем
- В чеках 54-ФЗ указываем `vat_code: 1` («Без НДС»)
- В оферте и на сайте — «НДС не облагается в связи с применением УСН»
- Для B2B-клиентов юрлиц это значит **они не смогут принять к вычету входной НДС** с наших услуг — но это нормальная практика для малого SaaS в РФ

**Грубый расчёт сколько клиентов даёт 20 млн:**
- Средний тариф B2C Pro: 2 900 ₽/мес = 34 800 ₽/год
- **20 000 000 ÷ 34 800 ≈ 575 платящих клиентов на годовой подписке**
- Плюс B2B тарифы 12 000-48 000 ₽/мес → ещё быстрее

При достижении 80% порога (~16 млн ₽) надо **заранее** решить:
1. Подавать в реестр Минцифры и получить льготу на ПО (НДС не платишь **независимо от выручки**)
2. Либо переходить на ИП или ООО с НДС 5% без вычетов (для SaaS обычно выгоднее)
3. Либо НДС 22% с вычетами (выгодно только если много закупок с НДС)

#### 0.4.2. Реестр российского ПО Минцифры — критично

По НК РФ подп. 26 п. 2 ст. 149, **передача прав на программы для ЭВМ**, включённые в реестр Минцифры, **освобождается от НДС** независимо от налогового режима и выручки.

Для Komplid это **стратегически важно**:
- Даже при выручке > 20 млн ₽ не переходим на НДС
- Льгота применяется к **лицензионным договорам на ПО** — именно так надо оформлять подписки
- Заявка подаётся через Госуслуги, срок рассмотрения — до 45 рабочих дней
- Требования: ПО должно работать на российских ОС, код принадлежит ИП/ООО-резиденту РФ
- Стоимость подачи: пошлина ~15 000 ₽, платные эксперты (опционально) ~30 000 ₽

**Начать процесс подачи в Минцифры нужно уже сейчас**, параллельно с разработкой. К моменту выхода на 10-15 млн ₽ льгота уже должна быть получена.

#### 0.4.3. Онлайн-касса (ФЗ-54) — обязательна с первого рубля

Режим налогообложения не освобождает от ФЗ-54. При приёме платежей от физических лиц (любым способом — карта, СБП, перевод) обязательно формировать фискальные чеки через онлайн-кассу.

**Два варианта:**

1. **«Чеки от ЮKassa»** (рекомендуется для старта)
   - Не нужна физическая касса, ЮKassa фискализирует сама
   - Доплата к комиссии +0.1-0.6%
   - Подключение через ЛК ЮKassa

2. **АТОЛ Онлайн / OrangeData / Ferma** (альтернатива)
   - Отдельный облачный сервис
   - От ~2 000 ₽/мес + ~3 ₽/чек
   - Больше гибкости при работе с разными платёжными системами

**Решение для документа:** используем «Чеки от ЮKassa». Проще, меньше интеграций, достаточно для MVP.

#### 0.4.4. Что это меняет в системе

**В чеках ФЗ-54:**
- `vat_code = 1` («Без НДС») по умолчанию
- ENV-переменная `YOOKASSA_VAT_CODE=1` (при смене режима — меняется на `11` для 22% или `12` для 22/122)
- В позициях чека `payment_subject: "service"` (услуги SaaS)

**В модели `Invoice`:**
- Поля `vatRate`, `vatAmount` остаются (для будущего), но по умолчанию 0
- В PDF-шаблоне счёта указывается «НДС не облагается (ИП на УСН)»
- В акте оказанных услуг — то же

**В оферте:**
- Чёткий пункт про применение УСН и освобождение от НДС
- Реквизиты ИП (ИНН, ОГРНИП, расчётный счёт)

**В админ-панели** (раздел 3.13, будет добавлен):
- Отчёт «Выручка по году» с индикатором приближения к порогу 20 млн
- Алерт при достижении 80% (16 млн ₽) — напоминание про Минцифры

**В ENV-переменных:**
- `TAX_REGIME=USN_INCOME_6` (для будущей логики если появятся разные режимы)
- `TAX_VAT_EXEMPT=true` (упрощает условия в коде)

#### 0.4.5. Стратегия роста и перехода

```
Этап 1: Старт (0-12 мес) — ИП на УСН Доходы 6% без НДС
  Выручка: 0 → 5 млн ₽
  Чеки через ЮKassa.Чеки
  Параллельно — подача в реестр Минцифры

Этап 2: Рост (12-24 мес) — ИП на УСН + льгота Минцифры
  Выручка: 5 → 15 млн ₽
  Приближаемся к порогу 20 млн (в 2027 уже 15 млн)
  Льгота Минцифры уже получена → НДС не возникает

Этап 3: Масштаб (24+ мес) — либо ИП с Минцифры, либо ООО
  Выручка: 15 → 50+ млн ₽
  Решение о форме: ИП при Минцифре продолжает без НДС
  Либо ООО для enterprise-сделок (гранты, крупные тендеры)
  Рассмотреть АУСН если применимо (лимит 60 млн без НДС)

Этап 4: Enterprise (при первых крупных B2B) — ООО параллельно с ИП
  Создание ООО для работы с госзаказчиками
  ИП остаётся для B2C-подписок
  Две кассы, две оферты, одно приложение
```

В документе описана архитектура **для Этапа 1-2**. При переходе на Этап 3-4 потребуется:
- Дополнить модели `Workspace` полем `taxRegime`
- Расширить логику выставления счетов под работу с НДС 22% для ООО
- Все соответствующие TODO помечены в коде комментариями `// TAX_TRANSITION`

---


## 1. Prisma-схема: полная финальная версия

### 1.1. Обзор изменений от Фазы 2 Модуля 15

Существующие модели (уже созданы):
- ✅ `SubscriptionPlan` — добавим поля
- ✅ `Subscription` — добавим поля
- ✅ `Payment` — расширим существенно

Новые модели (которые добавим):
- ⬜ `PaymentMethod` — сохранённые способы оплаты (для автопродления)
- ⬜ `SubscriptionEvent` — история изменений подписки (audit log)
- ⬜ `Receipt` — ФЗ-54 чеки (отдельно от платежа)
- ⬜ `Invoice` — счета для юрлиц (Enterprise тариф)
- ⬜ `PromoCode` и `PromoCodeRedemption` — скидочные коды
- ⬜ `DunningAttempt` — попытки списания при отказе карты
- ⬜ `CancellationReason` — причины отмены (для retention)

### 1.2. SubscriptionPlan — каталог тарифов

```prisma
model SubscriptionPlan {
  id              String              @id @default(uuid())
  slug            String              @unique  // "profi-basic-smetchik", "team-medium"
  name            String                       // "Сметчик-Студио Базовый"
  description     String?

  // Категория и роль
  category        PlanCategory                 // FREEMIUM / B2C / B2B / ENTERPRISE
  targetRole      ProfiRole?                   // SMETCHIK / PTO / PRORAB / null для B2B

  // Биллинг
  billingPeriod   BillingPeriod                // MONTHLY / YEARLY
  priceRub        Int                          // в копейках! (190000 = 1900.00 ₽)
  oldPriceRub     Int?                         // для "зачёркнутой" цены
  currency        String              @default("RUB")

  // Лимиты (все опциональные — null = без лимита)
  maxObjects           Int?                    // B2B: объектов в workspace
  maxUsers             Int?                    // B2B: штатных пользователей
  maxGuests            Int?                    // B2B: гостевых пользователей
  maxStorageGb         Int?                    // хранилище S3 в GB
  maxEstimatesPerMonth Int?                    // B2C Смета: смет в месяц
  maxAosrPerMonth      Int?                    // B2C ПТО: АОСР в месяц
  maxActiveObjects     Int?                    // B2C Прораб: активных объектов
  maxJournalEntriesPerMonth Int?               // B2C Прораб: записей в ОЖР в месяц
  maxPublicLinksActive Int?                    // B2C: активных публичных ссылок

  // Feature flags (JSON массив строковых ключей)
  features        Json                         // ["ecp", "routes", "fgis-cs", "bim", ...]

  // Trial
  trialDays       Int                 @default(0)   // 0 для Freemium, 14 для Pro
  trialFeatures   Json?                              // если отличаются от плана

  // Отображение
  displayOrder    Int                 @default(0)
  isPopular       Boolean             @default(false)   // "Рекомендуем"
  isVisible       Boolean             @default(true)    // видим в публичном каталоге
  isLegacy        Boolean             @default(false)   // устаревший, новые не покупают

  // Мета
  metadata        Json?                        // произвольные данные

  // Связи
  subscriptions   Subscription[]
  promoCodeRules  PromoCodeRule[]              // промо-коды применимые к этому плану

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@index([category, targetRole])
  @@index([slug])
  @@map("subscription_plans")
}

enum PlanCategory {
  FREEMIUM       // бесплатный, нужен для воронки
  B2C            // Профи-пакеты (Смета/ПТО/Прораб)
  B2B            // Team для компаний
  ENTERPRISE     // Corporate по запросу
}

enum ProfiRole {
  SMETCHIK       // Сметчик-Студио
  PTO            // ИД-Мастер
  PRORAB         // Прораб-Журнал
}

enum BillingPeriod {
  MONTHLY
  YEARLY
}
```

### 1.3. Subscription — активная подписка workspace

```prisma
model Subscription {
  id              String              @id @default(uuid())

  // Workspace и план
  workspaceId     String
  workspace       Workspace           @relation("WorkspaceAllSubscriptions", fields: [workspaceId], references: [id], onDelete: Cascade)
  activeForWorkspace Workspace?       @relation("WorkspaceActiveSubscription")  // обратная связь для activeSubscriptionId

  planId          String
  plan            SubscriptionPlan    @relation(fields: [planId], references: [id])

  // Статус и даты
  status          SubscriptionStatus

  // Период
  startedAt       DateTime            @default(now())
  currentPeriodStart DateTime                   // начало текущего расчётного периода
  currentPeriodEnd   DateTime                   // конец текущего расчётного периода

  // Trial
  trialStart      DateTime?
  trialEnd        DateTime?

  // Отмена
  cancelledAt     DateTime?                     // когда пользователь нажал "отменить"
  cancelReason    CancellationReasonCode?       // enum, см. ниже
  cancelFeedback  String?                       // произвольный текст
  effectiveEndDate DateTime?                    // когда фактически закончится (end-of-period)

  // Platform и apply_at для смены тарифа
  pendingPlanId   String?                       // план, на который сменить на следующий период
  pendingPlanChangeAt DateTime?                 // когда применить смену

  // Автопродление и способ оплаты
  autoRenew       Boolean             @default(true)
  defaultPaymentMethodId String?
  defaultPaymentMethod   PaymentMethod? @relation("SubscriptionDefaultMethod", fields: [defaultPaymentMethodId], references: [id])

  // Grace period (окончилась подписка, даём 7 дней readonly)
  graceUntil      DateTime?

  // Dunning (если не списалось — начинаем retry)
  dunningAttempts Int                 @default(0)
  nextDunningAt   DateTime?

  // Связи
  payments        Payment[]
  events          SubscriptionEvent[]
  invoices        Invoice[]
  receipts        Receipt[]

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@index([workspaceId, status])
  @@index([status, currentPeriodEnd])           // для cron-джоб продления
  @@index([status, graceUntil])                 // для cron-джоб очистки grace
  @@index([status, nextDunningAt])              // для cron-джоб dunning
  @@map("subscriptions")
}

enum SubscriptionStatus {
  TRIALING         // активный триал, ещё не платил
  ACTIVE           // платящий, автопродление включено
  PAST_DUE         // платёж не прошёл, идёт dunning
  GRACE            // grace period (7 дней readonly после окончания)
  CANCELLED        // отменён пользователем, но ещё действует до effectiveEndDate
  EXPIRED          // полностью закончился, доступа нет
  PAUSED           // временная пауза (опция в будущем)
}

enum CancellationReasonCode {
  TOO_EXPENSIVE      // дорого
  MISSING_FEATURES   // не хватает функций
  COMPETITOR         // ушёл к конкуренту
  NOT_USING          // не использую
  TECHNICAL_ISSUES   // технические проблемы
  TEMPORARY          // временно, вернусь
  OTHER              // другое
}
```

### 1.4. Payment — платежи

```prisma
model Payment {
  id              String          @id @default(uuid())

  // Привязка
  workspaceId     String
  workspace       Workspace       @relation(fields: [workspaceId], references: [id])
  subscriptionId  String?
  subscription    Subscription?   @relation(fields: [subscriptionId], references: [id])
  userId          String                          // кто инициировал платёж
  user            User            @relation("PaymentInitiator", fields: [userId], references: [id])

  // Сумма
  amountRub       Int                             // в копейках
  currency        String          @default("RUB")

  // Тип платежа
  type            PaymentType
  billingPeriod   BillingPeriod?                  // для PLAN_PAYMENT

  // Описание и метаданные
  description     String
  metadata        Json?

  // Статус (мапится на ЮKassa статусы)
  status          PaymentStatus
  statusChangedAt DateTime        @default(now())
  failureReason   String?                         // если FAILED

  // Провайдер
  provider        PaymentProvider @default(YOOKASSA)
  providerPaymentId String?       @unique         // payment.id из ЮKassa
  providerIdempotenceKey String   @unique         // Idempotence-Key отправленный в ЮKassa
  providerMetadata  Json?                         // raw объект от провайдера

  // Трёхмерная аутентификация и захват
  requiresCapture Boolean         @default(false)
  capturedAt      DateTime?
  confirmationUrl String?                         // URL для оплаты (редирект)

  // Способ оплаты
  paymentMethodId String?
  paymentMethod   PaymentMethod?  @relation(fields: [paymentMethodId], references: [id])
  savePaymentMethod Boolean       @default(false)   // сохранить для автопродлений
  paymentMethodSnapshot Json?                     // снимок метода на момент платежа

  // Промокоды и скидки
  promoCodeId     String?
  promoCode       PromoCode?      @relation(fields: [promoCodeId], references: [id])
  discountRub     Int?                            // фактическая скидка в копейках
  originalAmountRub Int?                          // цена до скидки

  // Возврат
  refundedAt      DateTime?
  refundedAmountRub Int?                          // частичные возвраты возможны
  refundReason    String?

  // Счёт-фактура и чек
  invoiceId       String?
  invoice         Invoice?        @relation(fields: [invoiceId], references: [id])
  receiptId       String?
  receipt         Receipt?        @relation(fields: [receiptId], references: [id])

  // Источник
  source          PaymentSource    @default(APP)
  ipAddress       String?
  userAgent       String?

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([workspaceId, createdAt(sort: Desc)])
  @@index([subscriptionId])
  @@index([status, createdAt])
  @@index([providerPaymentId])
  @@map("payments")
}

enum PaymentType {
  PLAN_PAYMENT       // первичная оплата тарифа
  PLAN_RENEWAL       // автопродление
  PLAN_UPGRADE       // апгрейд с proration
  PLAN_PRORATION     // только proration-доплата
  CREDIT_TOPUP       // пополнение кредитного счёта (рефералы)
  REFUND             // возврат (отрицательная сумма)
  MANUAL             // ручной платёж админа
}

enum PaymentStatus {
  PENDING               // создан, ждёт действия пользователя
  WAITING_FOR_CAPTURE   // двухстадийный: захват вручную
  AUTHORIZED            // деньги заморожены, ждёт capture
  SUCCEEDED             // успешно проведён
  FAILED                // ошибка платежа
  CANCELLED             // отменён пользователем или таймаут
  REFUNDED              // возвращён полностью
  PARTIALLY_REFUNDED    // возвращена часть
}

enum PaymentProvider {
  YOOKASSA
  TINKOFF         // на будущее
  SBERBANK        // на будущее
  MANUAL          // ручной админский платёж
}

enum PaymentSource {
  APP             // в личном кабинете
  MARKETING       // с komplid.ru редирект
  API             // через API (партнёры)
  ADMIN           // админская правка
  WEBHOOK         // инициирован webhook-ом (рекуррент)
}
```

### 1.5. PaymentMethod — сохранённые способы оплаты

```prisma
/// Сохранённый токен ЮKassa для рекуррентных списаний
model PaymentMethod {
  id              String        @id @default(uuid())

  // Владелец (обычно привязан к workspace, не user —
  // чтобы при смене owner workspace способ сохранялся)
  workspaceId     String
  workspace       Workspace     @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  // Провайдер и токен
  provider        PaymentProvider @default(YOOKASSA)
  providerMethodId String                       // payment_method.id из ЮKassa
  type            PaymentMethodType             // BANK_CARD / SBP / YOOMONEY / ...

  // Краткая информация (для отображения в UI)
  cardBrand       String?                       // VISA / MC / MIR
  cardLast4       String?                       // "1234"
  cardExpiryMonth Int?
  cardExpiryYear  Int?
  accountTitle    String?                       // "Карта МИР *1234" или "Кошелёк ЮMoney"

  // Статус
  isActive        Boolean       @default(true)
  deactivatedAt   DateTime?
  deactivationReason String?                    // "expired", "revoked_by_user", "failed_too_many_times"

  // Использование
  isDefault       Boolean       @default(false)
  lastUsedAt      DateTime?
  successfulChargesCount Int    @default(0)
  failedChargesCount Int        @default(0)

  // Связи
  subscriptions   Subscription[] @relation("SubscriptionDefaultMethod")
  payments        Payment[]

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@unique([workspaceId, providerMethodId])
  @@index([workspaceId, isActive])
  @@map("payment_methods")
}

enum PaymentMethodType {
  BANK_CARD         // банковская карта
  SBP               // Система быстрых платежей
  YOOMONEY          // ЮMoney кошелёк
  SBERPAY           // SberPay
  TPAY              // T-Pay (Тинькофф)
  YANDEX_PAY        // Yandex Pay
  INVOICE           // безналичный счёт (B2B)
}
```

### 1.6. SubscriptionEvent — audit log

```prisma
/// История всех изменений подписки — для аналитики и поддержки
model SubscriptionEvent {
  id              String        @id @default(uuid())
  subscriptionId  String
  subscription    Subscription  @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  type            SubscriptionEventType
  payload         Json                          // детали события

  // Инициатор
  actorType       ActorType                     // USER / SYSTEM / ADMIN / WEBHOOK
  actorUserId     String?
  actorUser       User?         @relation("SubscriptionEventActor", fields: [actorUserId], references: [id])

  createdAt       DateTime      @default(now())

  @@index([subscriptionId, createdAt(sort: Desc)])
  @@index([type, createdAt])
  @@map("subscription_events")
}

enum SubscriptionEventType {
  CREATED                // подписка создана
  TRIAL_STARTED          // начался триал
  TRIAL_ENDED            // триал закончился
  TRIAL_CONVERTED        // триал → платёж прошёл
  RENEWED                // успешное продление
  RENEWAL_FAILED         // продление не удалось
  UPGRADED               // апгрейд с proration
  DOWNGRADED             // даунгрейд (эффект с конца периода)
  PLAN_CHANGE_SCHEDULED  // смена тарифа запланирована
  CANCELLED              // отменён (но ещё активен)
  REACTIVATED            // отмена отменена
  EXPIRED                // окончательно истёк
  GRACE_STARTED          // начался grace period
  GRACE_EXPIRED          // закончился grace period
  PAUSED                 // приостановлен
  RESUMED                // возобновлён
  PAYMENT_METHOD_CHANGED // сменил способ оплаты
  DUNNING_START          // начался dunning
  DUNNING_RESOLVED       // dunning разрешён успешной оплатой
  DUNNING_FAILED         // dunning закончился без оплаты
  PROMO_APPLIED          // применён промокод
  MANUAL_EXTENSION       // админ вручную продлил
}

enum ActorType {
  USER
  SYSTEM        // cron, автопродление, dunning
  ADMIN         // ручное действие админа
  WEBHOOK       // callback от ЮKassa
  API           // внешний API
}
```

### 1.7. Receipt — чеки ФЗ-54

```prisma
/// Чек по 54-ФЗ — отдельная сущность, не привязана жёстко к платежу
/// т.к. могут быть чеки приёма, аванса, расчёта, возврата
model Receipt {
  id              String        @id @default(uuid())

  // Workspace и подписка
  workspaceId     String
  workspace       Workspace     @relation(fields: [workspaceId], references: [id])
  subscriptionId  String?
  subscription    Subscription? @relation(fields: [subscriptionId], references: [id])

  // Тип (по ФЗ-54)
  type            ReceiptType

  // Данные покупателя
  customerEmail   String
  customerPhone   String?
  customerInn     String?       // если юрлицо

  // Позиции чека
  items           Json          // [{ name, quantity, price, vat, paymentSubject, paymentMode }]

  // Суммы
  totalRub        Int           // общая сумма в копейках
  vatRub          Int           @default(0)   // сумма НДС. Для ИП на УСН без НДС = 0. Оставляем поле для будущего перехода на НДС.

  // Провайдер фискализации
  provider        ReceiptProvider @default(YOOKASSA)
  providerReceiptId String?     @unique
  ofdUrl          String?       // ссылка на чек в ОФД
  ofdPdfUrl       String?       // PDF-версия чека

  // Статус
  status          ReceiptStatus
  statusChangedAt DateTime      @default(now())
  errorMessage    String?

  // Фискальные признаки
  fiscalDocumentNumber    String?
  fiscalDocumentAttribute String?
  fiscalDriveNumber       String?
  registeredAt            DateTime?

  // Связи
  payments        Payment[]

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([workspaceId, createdAt(sort: Desc)])
  @@index([subscriptionId])
  @@index([status])
  @@map("receipts")
}

enum ReceiptType {
  PAYMENT           // приход денег (основной при оплате)
  PREPAYMENT        // предоплата (аванс)
  FULL_PAYMENT      // полный расчёт (когда услуга оказана, для подписок ~ это каждый расчётный период)
  REFUND            // возврат
  CREDIT            // кредит (выдача товара без оплаты — не используется для подписок)
}

enum ReceiptProvider {
  YOOKASSA          // "Чеки от ЮKassa" (встроенное решение)
  EVOTOR_CLOUD      // облачная касса Эвотор
  ATOL_ONLINE       // АТОЛ Онлайн
  NONE              // пока не используем (только для Enterprise со счёт-фактурами)
}

enum ReceiptStatus {
  PENDING           // создан, ждёт отправки в ОФД
  SUBMITTED         // отправлен в ОФД, ждёт подтверждения
  REGISTERED        // успешно зарегистрирован, фискализирован
  FAILED            // ошибка
  RETRY             // будет повтор
}
```

### 1.8. Invoice — счета для юрлиц (Enterprise)

```prisma
/// Счёт на оплату для юрлиц (B2B Enterprise-flow)
/// Используется когда клиент платит по безналу с расчётного счёта
model Invoice {
  id              String        @id @default(uuid())

  // Номер счёта (человеко-читаемый)
  number          String        @unique         // "КП-2026-00123"

  // Workspace (должен быть type=COMPANY с organizationId)
  workspaceId     String
  workspace       Workspace     @relation(fields: [workspaceId], references: [id])
  organizationId  String
  organization    Organization  @relation("InvoiceOrganization", fields: [organizationId], references: [id])

  // Тариф и период
  planId          String
  plan            SubscriptionPlan @relation("InvoicePlan", fields: [planId], references: [id])
  billingPeriod   BillingPeriod
  periodStart     DateTime
  periodEnd       DateTime

  // Количество лицензий (для Team-тарифов)
  seatsCount      Int           @default(1)

  // Суммы
  // ВАЖНО: для ИП на УСН без НДС totalRub == subtotalRub, vatRub = 0.
  // Поля оставлены для будущего перехода на НДС (когда выручка превысит 20 млн
  // ₽/год, или если перейдём на ООО). В PDF-шаблоне счёта при vatRub=0
  // указывается "НДС не облагается (ИП на УСН)".
  subtotalRub     Int                           // без НДС
  vatRub          Int           @default(0)     // сумма НДС (0 для ИП на УСН)
  totalRub        Int                           // итого (для УСН = subtotalRub)
  currency        String        @default("RUB")

  // Документы
  pdfUrl          String?                       // сгенерированный PDF счёта
  contractPdfUrl  String?                       // договор-оферта
  actPdfUrl       String?                       // акт выполненных работ (по окончании периода)

  // Статус
  status          InvoiceStatus
  statusChangedAt DateTime      @default(now())

  // Даты
  issuedAt        DateTime      @default(now())  // дата выставления
  dueAt           DateTime                      // срок оплаты (обычно +5 рабочих дней)
  paidAt          DateTime?
  cancelledAt     DateTime?

  // Связи
  subscriptionId  String?
  subscription    Subscription? @relation(fields: [subscriptionId], references: [id])
  payments        Payment[]

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([workspaceId, issuedAt(sort: Desc)])
  @@index([status, dueAt])
  @@map("invoices")
}

enum InvoiceStatus {
  DRAFT              // черновик, не отправлен клиенту
  ISSUED             // выставлен, ждёт оплаты
  PAID               // оплачен
  PARTIALLY_PAID     // оплачен частично
  OVERDUE            // просрочен
  CANCELLED          // отменён
}
```

### 1.9. PromoCode — промокоды

```prisma
model PromoCode {
  id              String        @id @default(uuid())
  code            String        @unique            // "SUMMER30", "YOUTUBE-15"

  // Тип скидки
  discountType    DiscountType
  discountValue   Int                              // проценты (0-100) или фикс сумма в копейках
  maxDiscountRub  Int?                             // максимальная скидка для % типа

  // Применимость
  applicableToPlans PromoCodeRule[]                // конкретные планы
  applicableToCategories PlanCategory[]            // категории планов

  // Ограничения
  isFirstPaymentOnly Boolean     @default(true)    // только на первый платёж
  validFrom        DateTime      @default(now())
  validUntil       DateTime?

  // Лимиты
  maxTotalRedemptions Int?                         // лимит на весь промокод
  maxPerUser       Int           @default(1)

  // Статистика (денормализованная)
  redemptionsCount Int           @default(0)

  // Источник
  source          String?                          // "email_campaign", "influencer_youtube", "referral"
  createdByUserId String?
  createdByUser   User?         @relation("PromoCodeCreator", fields: [createdByUserId], references: [id])

  redemptions     PromoCodeRedemption[]
  payments        Payment[]

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([code])
  @@map("promo_codes")
}

enum DiscountType {
  PERCENT       // 30 = 30%
  FIXED_AMOUNT  // в копейках
  TRIAL_DAYS    // продление триала (discountValue = дни)
  FREE_MONTHS   // бесплатные месяцы (discountValue = кол-во)
}

/// Какие планы применимы к промо-коду (M:N)
model PromoCodeRule {
  promoCodeId     String
  promoCode       PromoCode     @relation(fields: [promoCodeId], references: [id], onDelete: Cascade)
  planId          String
  plan            SubscriptionPlan @relation(fields: [planId], references: [id], onDelete: Cascade)

  @@id([promoCodeId, planId])
  @@map("promo_code_rules")
}

/// Фиксация использования промокода
model PromoCodeRedemption {
  id              String        @id @default(uuid())
  promoCodeId     String
  promoCode       PromoCode     @relation(fields: [promoCodeId], references: [id])
  workspaceId     String
  workspace       Workspace     @relation(fields: [workspaceId], references: [id])
  userId          String
  user            User          @relation("PromoCodeRedeemer", fields: [userId], references: [id])
  paymentId       String?
  payment         Payment?      @relation("PaymentPromoRedemption", fields: [paymentId], references: [id])

  discountAppliedRub Int

  createdAt       DateTime      @default(now())

  @@unique([promoCodeId, workspaceId])     // один промо на workspace
  @@index([workspaceId])
  @@map("promo_code_redemptions")
}
```

### 1.10. DunningAttempt — серия попыток списания

```prisma
/// При отказе автосписания делаем серию retry по расписанию
/// (обычно 3-5 попыток с интервалами 1 день, 3 дня, 5 дней, 7 дней)
model DunningAttempt {
  id              String        @id @default(uuid())
  subscriptionId  String
  subscription    Subscription  @relation("SubscriptionDunning", fields: [subscriptionId], references: [id], onDelete: Cascade)

  attemptNumber   Int                          // 1, 2, 3, ...
  scheduledAt     DateTime                     // когда запланирован retry
  executedAt      DateTime?                    // когда выполнен
  paymentId       String?                      // созданный платёж
  payment         Payment?      @relation("DunningPayment", fields: [paymentId], references: [id])

  result          DunningResult?
  failureReason   String?

  // Уведомления пользователю
  emailSentAt     DateTime?
  userResponseAction UserDunningAction?        // обновил карту / отменил / проигнорировал

  createdAt       DateTime      @default(now())

  @@index([subscriptionId, attemptNumber])
  @@index([scheduledAt, result])
  @@map("dunning_attempts")
}

enum DunningResult {
  SUCCESS           // платёж прошёл
  FAILED            // платёж не прошёл
  CARD_EXPIRED      // карта истекла — больше не пробуем
  USER_CANCELLED    // пользователь отменил подписку вручную
  USER_UPDATED_CARD // пользователь обновил карту — начать с 1-й попытки
}

enum UserDunningAction {
  UPDATED_PAYMENT_METHOD
  CANCELLED_SUBSCRIPTION
  IGNORED
}
```

---

## 2. ЮKassa: полная интеграция

### 2.1. Выбор SDK и архитектура

**Решение: писать свой минимальный клиент**, а не тащить стороннюю зависимость.

Обоснование:
- `yookassa-ts` — 110 downloads/week, последний релиз май 2023 — **мёртвый**
- `yookassa` (olegpolyakov) — без типов, без retry, устаревшие методы
- `yookassa-ts-sdk` и `yookassa-sdk-node` — молодые, неизвестный maintainer
- Полный API помещается в **~200 строк** TypeScript с `fetch`
- Нужны свои error-classes и логирование через pino (как в остальном проекте)

Структура:
```
src/lib/payments/
├── yookassa/
│   ├── client.ts           # базовый HTTP-клиент (auth, idempotency, retry)
│   ├── payments.ts         # создание платежей, захват, отмена
│   ├── refunds.ts          # возвраты
│   ├── payment-methods.ts  # сохранение способов
│   ├── receipts.ts         # чеки 54-ФЗ
│   ├── webhooks.ts         # верификация и парсинг callback
│   ├── types.ts            # полные типы ответов ЮKassa API
│   └── errors.ts           # YookassaError, YookassaValidationError, etc.
├── providers/
│   └── yookassa-provider.ts # абстракция PaymentProvider (для будущих Тинькофф/Сбера)
├── subscription-service.ts  # орchestrator: создание подписки, renewal, upgrade
├── dunning-service.ts      # retry-логика при отказах
├── proration.ts            # расчёт пропорциональной доплаты
└── subscription-service.test.ts
```

### 2.2. Критичные факты ЮKassa на 2026 год

**ФАКТ 1: Повышение комиссии ЮKassa на сумму НДС 22% с 1 января 2026**

С 1 января 2026 к комиссии ЮKassa (которая платит свой НДС как оператор эквайринга) добавляется НДС 22% — но это **НДС ЮKassa**, а не наш.

Раньше: комиссия 3.5% → получаешь 100 ₽ − 3.5 ₽ = 96.5 ₽
С 2026: комиссия 3.5% + НДС 22% на комиссию → 100 ₽ − 3.5 ₽ − 0.77 ₽ = 95.73 ₽

**Вывод для нашей экономики:** эффективная комиссия выросла с ~3.5% до ~4.27%. Это **не наш НДС**, а рост стоимости услуг эквайринга. Мы как ИП на УСН свой НДС не платим, но получаем меньше за счёт роста комиссии.

**ФАКТ 2: С 29 декабря 2025 ЮMoney прекратила поддержку самозанятых**

Раньше ЮKassa могла выдавать чеки самозанятым через "Мой налог" автоматически. Теперь — нет. **Для Komplid это не проблема:**
- Мы — ИП на УСН, а не самозанятый
- Чек выдаёт наше ИП через "Чеки от ЮKassa"
- Покупатели-самозанятые просто платят с обычной карты физлица, чек получают от нашего ИП

Важный нюанс: если позже решим работать с самозанятыми как с отдельной категорией B2C-клиентов — для них всё ровно так же: платят картой, получают чек от нашего ИП. Ничего специального делать не надо.

**ФАКТ 3: ЮKassa не фискализирует платежи сама. Нужна касса.**

Два варианта:
- **"Чеки от ЮKassa"** — встроенное решение, +0.1–0.6% к комиссии. **Наш выбор.**
- Отдельная облачная касса (АТОЛ Онлайн, OrangeData, Ferma) — сложнее, но гибче.

Для старта идём с "Чеки от ЮKassa" — пара кликов в ЛК, включается через флаг в API-запросе.

**ФАКТ 4: Рекуррентные платежи нужно отдельно включать в поддержке**

Ключевая процедура на старте: после создания магазина написать в поддержку ЮKassa запрос на включение **автоплатежей** (save_payment_method + auto-payments). Срок — 1-3 рабочих дня.

**ФАКТ 5: HMAC-подпись webhook'ов не встроена**

ЮKassa не подписывает webhook'и по умолчанию. Безопасность обеспечивается **IP-whitelist**. Официальные IP-диапазоны ЮKassa:
- 185.71.76.0/27
- 185.71.77.0/27
- 77.75.153.0/25
- 77.75.156.11/32
- 77.75.156.35/32
- 77.75.154.128/25

На проде **проверять исходящий IP** в middleware перед обработкой webhook.

**ФАКТ 6: Idempotence-Key обязателен**

Все POST запросы требуют заголовок `Idempotence-Key` (UUID v4). ЮKassa хранит идемпотентность **24 часа**. Повтор запроса с тем же ключом возвращает результат оригинального.

### 2.3. Базовый клиент `yookassa/client.ts`

```typescript
// src/lib/payments/yookassa/client.ts
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';
import { YookassaError, YookassaNetworkError, YookassaValidationError } from './errors';

const YOOKASSA_BASE_URL = 'https://api.yookassa.ru/v3';

interface YookassaClientConfig {
  shopId: string;
  secretKey: string;
  timeoutMs?: number;
  maxRetries?: number;
}

interface RequestOptions {
  method: 'GET' | 'POST';
  path: string;
  body?: Record<string, unknown>;
  idempotenceKey?: string;  // для POST — обязательно
}

export class YookassaClient {
  private readonly authHeader: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(config: YookassaClientConfig) {
    this.authHeader = 'Basic ' + Buffer.from(`${config.shopId}:${config.secretKey}`).toString('base64');
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.maxRetries = config.maxRetries ?? 3;
  }

  async request<T>(options: RequestOptions): Promise<T> {
    const { method, path, body } = options;
    const idempotenceKey = options.idempotenceKey ?? (method === 'POST' ? randomUUID() : undefined);

    const headers: Record<string, string> = {
      'Authorization': this.authHeader,
      'Content-Type': 'application/json',
    };
    if (idempotenceKey) headers['Idempotence-Key'] = idempotenceKey;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(`${YOOKASSA_BASE_URL}${path}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
        clearTimeout(timer);

        const responseBody = await response.text();
        let parsed: unknown;
        try {
          parsed = responseBody ? JSON.parse(responseBody) : {};
        } catch {
          parsed = { raw: responseBody };
        }

        if (!response.ok) {
          // Ошибки валидации (400, 404) не ретраим
          if (response.status >= 400 && response.status < 500) {
            logger.warn({ status: response.status, body: parsed, path }, 'YooKassa validation error');
            throw new YookassaValidationError(response.status, parsed);
          }
          // 5xx и сетевые — ретраим
          logger.warn({ attempt, status: response.status, path }, 'YooKassa server error, retrying');
          lastError = new YookassaError(`YooKassa server error ${response.status}`, parsed);
          continue;
        }

        logger.debug({ path, attempt }, 'YooKassa request succeeded');
        return parsed as T;
      } catch (error) {
        if (error instanceof YookassaValidationError) throw error;  // не ретраим
        lastError = error as Error;
        logger.warn({ attempt, error: lastError.message, path }, 'YooKassa request failed');

        // Exponential backoff: 1s, 2s, 4s
        if (attempt < this.maxRetries) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
        }
      }
    }

    throw new YookassaNetworkError(
      `YooKassa request failed after ${this.maxRetries} attempts: ${lastError?.message}`,
      lastError
    );
  }
}

// Singleton
let clientInstance: YookassaClient | null = null;

export function getYookassaClient(): YookassaClient {
  if (!clientInstance) {
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;
    if (!shopId || !secretKey) {
      throw new Error('YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY must be set');
    }
    clientInstance = new YookassaClient({ shopId, secretKey });
  }
  return clientInstance;
}
```

### 2.4. Создание платежа `yookassa/payments.ts`

```typescript
// src/lib/payments/yookassa/payments.ts
import { getYookassaClient } from './client';
import type {
  YookassaPayment,
  YookassaPaymentAmount,
  YookassaPaymentCreateRequest,
  YookassaReceiptData,
  YookassaConfirmation,
} from './types';

interface CreatePaymentParams {
  amount: { value: string; currency: 'RUB' };
  description: string;
  metadata: Record<string, string>;           // workspaceId, subscriptionId, paymentId
  idempotenceKey: string;
  returnUrl: string;                          // куда вернуть после оплаты
  confirmation?: 'redirect' | 'embedded';     // redirect (default) или widget
  savePaymentMethod?: boolean;                // сохранить для автопродлений
  paymentMethodId?: string;                   // если хотим списать с сохранённого
  capture?: boolean;                          // true = одностадийно
  receipt?: YookassaReceiptData;              // для 54-ФЗ
}

export async function createPayment(params: CreatePaymentParams): Promise<YookassaPayment> {
  const client = getYookassaClient();

  const body: YookassaPaymentCreateRequest = {
    amount: params.amount,
    description: params.description,
    metadata: params.metadata,
    capture: params.capture ?? true,
  };

  // confirmation: либо redirect, либо сохранённый payment_method_id
  if (params.paymentMethodId) {
    body.payment_method_id = params.paymentMethodId;
    // confirmation не указываем — списывается сразу
  } else {
    body.confirmation = {
      type: params.confirmation === 'embedded' ? 'embedded' : 'redirect',
      return_url: params.returnUrl,
    };
  }

  if (params.savePaymentMethod) {
    body.save_payment_method = true;
  }

  if (params.receipt) {
    body.receipt = params.receipt;
  }

  return client.request<YookassaPayment>({
    method: 'POST',
    path: '/payments',
    body,
    idempotenceKey: params.idempotenceKey,
  });
}

/**
 * Автоплатёж по сохранённому способу.
 * Вызывается при продлении подписки.
 */
export async function chargeRecurring(params: {
  paymentMethodId: string;
  amount: { value: string; currency: 'RUB' };
  description: string;
  metadata: Record<string, string>;
  idempotenceKey: string;
  receipt?: YookassaReceiptData;
}): Promise<YookassaPayment> {
  const client = getYookassaClient();

  return client.request<YookassaPayment>({
    method: 'POST',
    path: '/payments',
    idempotenceKey: params.idempotenceKey,
    body: {
      amount: params.amount,
      payment_method_id: params.paymentMethodId,
      description: params.description,
      metadata: params.metadata,
      capture: true,
      receipt: params.receipt,
    },
  });
}

export async function getPayment(paymentId: string): Promise<YookassaPayment> {
  const client = getYookassaClient();
  return client.request<YookassaPayment>({ method: 'GET', path: `/payments/${paymentId}` });
}

export async function capturePayment(paymentId: string, amount?: YookassaPaymentAmount): Promise<YookassaPayment> {
  const client = getYookassaClient();
  return client.request<YookassaPayment>({
    method: 'POST',
    path: `/payments/${paymentId}/capture`,
    body: amount ? { amount } : undefined,
  });
}

export async function cancelPayment(paymentId: string): Promise<YookassaPayment> {
  const client = getYookassaClient();
  return client.request<YookassaPayment>({
    method: 'POST',
    path: `/payments/${paymentId}/cancel`,
  });
}
```

### 2.5. Возвраты `yookassa/refunds.ts`

```typescript
// src/lib/payments/yookassa/refunds.ts
import { getYookassaClient } from './client';
import type { YookassaRefund, YookassaPaymentAmount } from './types';

export async function createRefund(params: {
  paymentId: string;
  amount: YookassaPaymentAmount;
  description: string;
  idempotenceKey: string;
  receipt?: unknown;
}): Promise<YookassaRefund> {
  const client = getYookassaClient();
  return client.request<YookassaRefund>({
    method: 'POST',
    path: '/refunds',
    idempotenceKey: params.idempotenceKey,
    body: {
      payment_id: params.paymentId,
      amount: params.amount,
      description: params.description,
      receipt: params.receipt,
    },
  });
}
```

### 2.6. Чеки 54-ФЗ

Чтобы ЮKassa выдавала чеки — при создании платежа передаём объект `receipt`:

```typescript
// src/lib/payments/yookassa/receipts.ts

export interface ReceiptItem {
  description: string;            // "Подписка Komplid Сметчик-Студио Pro, 1 мес"
  quantity: string;               // "1.00"
  amount: { value: string; currency: 'RUB' };
  vat_code: VatCode;              // код НДС
  payment_mode: PaymentMode;      // полный расчёт
  payment_subject: PaymentSubject; // услуга
}

export enum VatCode {
  NO_VAT = 1,                     // Без НДС — наш случай для ИП на УСН и для ПО в реестре Минцифры
  VAT_0 = 2,                      // 0% — экспорт
  VAT_10 = 3,                     // 10% — льготные товары
  VAT_20 = 4,                     // 20% (действовало до 2025)
  VAT_10_110 = 5,                 // 10/110 расчётная
  VAT_20_120 = 6,                 // 20/120 расчётная (до 2025)
  VAT_22 = 7,                     // 22% (с 1 января 2026)
  VAT_22_122 = 8,                 // 22/122 расчётная (с 1 января 2026)
}

export enum PaymentMode {
  FULL_PREPAYMENT = 'full_prepayment',   // предоплата 100%
  PARTIAL_PREPAYMENT = 'partial_prepayment',
  ADVANCE = 'advance',
  FULL_PAYMENT = 'full_payment',         // полный расчёт (для подписки на месяц — это оно)
  PARTIAL_PAYMENT = 'partial_payment',
  CREDIT = 'credit',
  CREDIT_PAYMENT = 'credit_payment',
}

export enum PaymentSubject {
  COMMODITY = 'commodity',
  EXCISE = 'excise',
  JOB = 'job',
  SERVICE = 'service',              // наш случай для подписок
  PAYMENT = 'payment',
  COMPOSITE = 'composite',
  ANOTHER = 'another',
}

/**
 * Строит объект receipt для передачи в ЮKassa при создании платежа.
 *
 * ДЛЯ ИП НА УСН: vat_code = 1 (без НДС) по умолчанию.
 * При будущем переходе на плательщика НДС — меняется через ENV или проп.
 */
export function buildSubscriptionReceipt(params: {
  email: string;
  phone?: string;
  customerInn?: string;
  customerName?: string;
  plan: { name: string; priceRub: number };  // цена в копейках
  billingPeriod: 'MONTHLY' | 'YEARLY';
}): YookassaReceiptData {
  const periodLabel = params.billingPeriod === 'YEARLY' ? '1 год' : '1 мес';

  // Режим налогообложения из ENV.
  // Для ИП на УСН = '1' (без НДС).
  // Когда будет льгота Минцифры для лицензий на ПО — тоже '1'.
  // При переходе на плательщика НДС — '7' (22%) или '8' (22/122).
  const vatCode = Number(process.env.YOOKASSA_VAT_CODE ?? '1') as VatCode;

  return {
    customer: {
      email: params.email,
      phone: params.phone,
      inn: params.customerInn,
      full_name: params.customerName,
    },
    items: [
      {
        description: `${params.plan.name}, подписка на ${periodLabel}`,
        quantity: '1.00',
        amount: {
          value: (params.plan.priceRub / 100).toFixed(2),
          currency: 'RUB',
        },
        vat_code: vatCode,
        payment_mode: PaymentMode.FULL_PAYMENT,
        payment_subject: PaymentSubject.SERVICE,
      },
    ],
  };
}
```

**Важный момент про НДС для Komplid (ИП на УСН).**

По умолчанию `vat_code = 1` («Без НДС») — это соответствует текущему налоговому режиму. Komplid — ИП на УСН «Доходы» 6%, выручка до 20 млн ₽/год автоматически освобождена от НДС (ФЗ №425 от 28.11.2025, ст. 145 НК РФ).

Три сценария применения:

1. **Текущий сценарий (выручка < 20 млн ₽):** `YOOKASSA_VAT_CODE=1` — освобождение от НДС по УСН
2. **После попадания в реестр Минцифры:** всё равно `YOOKASSA_VAT_CODE=1` — но теперь льгота действует независимо от выручки (подп. 26 п. 2 ст. 149 НК РФ, передача прав на ПО)
3. **Переход на плательщика НДС (выручка > 20 млн без Минцифры):** `YOOKASSA_VAT_CODE=7` (22%) или `=8` (22/122 расчётная)

Менять можно через одну ENV-переменную — без пересборки приложения.

### 2.7. Webhook обработка `yookassa/webhooks.ts`

```typescript
// src/lib/payments/yookassa/webhooks.ts
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { getPayment } from './payments';
import type { YookassaNotification, YookassaPayment } from './types';

// Белый список IP ЮKassa (на дату апрель 2026)
const YOOKASSA_ALLOWED_IPS = [
  '185.71.76.0/27',
  '185.71.77.0/27',
  '77.75.153.0/25',
  '77.75.156.11/32',
  '77.75.156.35/32',
  '77.75.154.128/25',
];

/**
 * Проверяет, что запрос пришёл с IP ЮKassa.
 * Использовать в middleware перед вызовом handleNotification.
 */
export function isYookassaIp(ip: string): boolean {
  // Реализация IP CIDR check через ip-cidr npm пакет
  // Код опущен для краткости
  return checkCidrList(ip, YOOKASSA_ALLOWED_IPS);
}

/**
 * Обработка webhook от ЮKassa.
 * Важно: обрабатываем идемпотентно, т.к. ЮKassa может отправить повторно
 * если мы не ответили 200 OK за 30 секунд.
 */
export async function handleNotification(notification: YookassaNotification): Promise<void> {
  const { event, object: payment } = notification;

  logger.info({ event, paymentId: payment.id, status: payment.status }, 'YooKassa notification received');

  // Для идемпотентности: проверяем, не обработали ли уже
  const existing = await db.payment.findUnique({
    where: { providerPaymentId: payment.id },
  });

  if (!existing) {
    logger.warn({ paymentId: payment.id }, 'Payment not found in DB, skipping');
    return;
  }

  // Пересекаем статусы
  switch (event) {
    case 'payment.succeeded':
      await handlePaymentSucceeded(existing.id, payment);
      break;
    case 'payment.canceled':
      await handlePaymentCanceled(existing.id, payment);
      break;
    case 'payment.waiting_for_capture':
      await handlePaymentWaitingForCapture(existing.id, payment);
      break;
    case 'refund.succeeded':
      await handleRefundSucceeded(payment);
      break;
    default:
      logger.warn({ event }, 'Unhandled YooKassa event');
  }
}

async function handlePaymentSucceeded(paymentDbId: string, yk: YookassaPayment): Promise<void> {
  // Полная логика в src/lib/payments/subscription-service.ts handleSuccessfulPayment(paymentDbId, yk)
  const { handleSuccessfulPayment } = await import('../subscription-service');
  await handleSuccessfulPayment(paymentDbId, yk);
}

async function handlePaymentCanceled(paymentDbId: string, yk: YookassaPayment): Promise<void> {
  const { handleCancelledPayment } = await import('../subscription-service');
  await handleCancelledPayment(paymentDbId, yk);
}

async function handlePaymentWaitingForCapture(paymentDbId: string, yk: YookassaPayment): Promise<void> {
  // В нашем сценарии не должно возникать — мы используем capture=true
  logger.warn({ paymentDbId, yk }, 'Unexpected waiting_for_capture');
}

async function handleRefundSucceeded(refund: unknown): Promise<void> {
  const { handleSuccessfulRefund } = await import('../subscription-service');
  await handleSuccessfulRefund(refund);
}

function checkCidrList(ip: string, cidrs: string[]): boolean {
  // Реализация через ip-cidr или ipaddr.js
  return true; // placeholder
}
```

### 2.8. API-endpoint `/api/webhooks/yookassa/route.ts`

```typescript
// src/app/api/webhooks/yookassa/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { handleNotification, isYookassaIp } from '@/lib/payments/yookassa/webhooks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // 1. Проверяем IP
  const clientIp = getClientIp(req);
  if (!isYookassaIp(clientIp)) {
    logger.warn({ clientIp }, 'YooKassa webhook from unknown IP');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2. Парсим тело
  let notification;
  try {
    notification = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // 3. Обрабатываем асинхронно, но отвечаем 200 сразу (< 30 сек)
  //    Важно: catch все ошибки внутри, чтобы не отправить обратно 500
  handleNotification(notification).catch((err) => {
    logger.error({ err, notification }, 'Failed to process YooKassa notification');
  });

  return NextResponse.json({ ok: true });
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return '0.0.0.0';
}
```

### 2.9. Subscription Service — оркестратор

```typescript
// src/lib/payments/subscription-service.ts
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { addMonths, addYears } from 'date-fns';
import type { YookassaPayment } from './yookassa/types';
import { PaymentStatus, SubscriptionStatus, SubscriptionEventType, ActorType } from '@prisma/client';

/**
 * Обработка успешного платежа.
 * Вызывается из webhook при получении payment.succeeded.
 */
export async function handleSuccessfulPayment(paymentDbId: string, yk: YookassaPayment): Promise<void> {
  await db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentDbId },
      include: { subscription: { include: { plan: true } } },
    });
    if (!payment) throw new Error(`Payment ${paymentDbId} not found`);
    if (payment.status === PaymentStatus.SUCCEEDED) {
      logger.info({ paymentId: paymentDbId }, 'Payment already processed');
      return;  // идемпотентность
    }

    // 1. Обновляем платёж
    await tx.payment.update({
      where: { id: paymentDbId },
      data: {
        status: PaymentStatus.SUCCEEDED,
        statusChangedAt: new Date(),
        capturedAt: new Date(),
        providerMetadata: yk as unknown as object,
      },
    });

    // 2. Если есть связанная подписка — обновляем
    if (payment.subscription) {
      const sub = payment.subscription;

      // Для PLAN_RENEWAL — продлеваем период
      if (payment.type === 'PLAN_RENEWAL' || payment.type === 'PLAN_PAYMENT') {
        const addFn = sub.plan.billingPeriod === 'YEARLY' ? addYears : addMonths;
        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: sub.currentPeriodEnd,
            currentPeriodEnd: addFn(sub.currentPeriodEnd, 1),
            dunningAttempts: 0,                   // сбрасываем dunning
            nextDunningAt: null,
            graceUntil: null,                     // сбрасываем grace
          },
        });

        await tx.subscriptionEvent.create({
          data: {
            subscriptionId: sub.id,
            type: payment.type === 'PLAN_PAYMENT' ? SubscriptionEventType.CREATED : SubscriptionEventType.RENEWED,
            payload: { paymentId: payment.id, amountRub: payment.amountRub },
            actorType: ActorType.WEBHOOK,
          },
        });
      }

      // 3. Если был сохранён способ оплаты — записываем PaymentMethod
      if (yk.payment_method && yk.payment_method.saved) {
        await upsertPaymentMethod(tx, sub.workspaceId, yk);
      }
    }

    // 4. Создаём чек 54-ФЗ (асинхронно)
    // ...
  });

  logger.info({ paymentId: paymentDbId }, 'Payment processed successfully');
}

/**
 * Создание подписки (первая оплата).
 * Вызывается из /api/subscriptions/start когда пользователь выбрал тариф.
 */
export async function startSubscription(params: {
  workspaceId: string;
  userId: string;
  planId: string;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  promoCode?: string;
  returnUrl: string;
  confirmation?: 'redirect' | 'embedded';
}): Promise<{ payment: YookassaPayment; confirmationUrl: string | null }> {
  // 1. Валидация workspace и плана
  const workspace = await db.workspace.findUniqueOrThrow({
    where: { id: params.workspaceId },
    include: { activeSubscription: true },
  });
  const plan = await db.subscriptionPlan.findUniqueOrThrow({ where: { id: params.planId } });

  if (plan.billingPeriod !== params.billingPeriod) {
    throw new Error('Billing period mismatch');
  }

  // 2. Проверка что workspace ещё не имеет активной платной подписки на этот план
  if (workspace.activeSubscription && workspace.activeSubscription.planId === params.planId) {
    throw new Error('Already subscribed to this plan');
  }

  // 3. Применяем промокод если есть
  let finalAmountRub = plan.priceRub;
  let promoCodeId: string | null = null;
  let discountRub = 0;

  if (params.promoCode) {
    const { validateAndApplyPromoCode } = await import('./promo-service');
    const result = await validateAndApplyPromoCode(params.promoCode, params.workspaceId, plan);
    finalAmountRub = result.finalAmountRub;
    promoCodeId = result.promoCodeId;
    discountRub = result.discountRub;
  }

  // 4. Создаём Subscription (pending до webhook)
  const { randomUUID } = await import('crypto');
  const idempotenceKey = randomUUID();

  const subscription = await db.subscription.create({
    data: {
      workspaceId: params.workspaceId,
      planId: params.planId,
      status: SubscriptionStatus.TRIALING,  // до подтверждения платежа
      currentPeriodStart: new Date(),
      currentPeriodEnd: plan.billingPeriod === 'YEARLY'
        ? addYears(new Date(), 1)
        : addMonths(new Date(), 1),
      autoRenew: true,
    },
  });

  const payment = await db.payment.create({
    data: {
      workspaceId: params.workspaceId,
      subscriptionId: subscription.id,
      userId: params.userId,
      type: 'PLAN_PAYMENT',
      billingPeriod: params.billingPeriod,
      amountRub: finalAmountRub,
      originalAmountRub: plan.priceRub !== finalAmountRub ? plan.priceRub : null,
      discountRub: discountRub || null,
      promoCodeId,
      description: `Подписка: ${plan.name}`,
      status: PaymentStatus.PENDING,
      provider: 'YOOKASSA',
      providerIdempotenceKey: idempotenceKey,
      savePaymentMethod: true,  // для автопродления
    },
  });

  // 5. Создаём платёж в ЮKassa
  const { createPayment } = await import('./yookassa/payments');
  const { buildSubscriptionReceipt } = await import('./yookassa/receipts');

  const user = await db.user.findUniqueOrThrow({ where: { id: params.userId } });

  const receipt = buildSubscriptionReceipt({
    email: user.email,
    phone: user.phone ?? undefined,
    plan: { name: plan.name, priceRub: finalAmountRub },
    billingPeriod: params.billingPeriod,
  });

  const ykPayment = await createPayment({
    amount: {
      value: (finalAmountRub / 100).toFixed(2),
      currency: 'RUB',
    },
    description: `Подписка ${plan.name}${discountRub ? ` (скидка ${(discountRub / 100).toFixed(0)}₽)` : ''}`,
    metadata: {
      paymentDbId: payment.id,
      subscriptionId: subscription.id,
      workspaceId: params.workspaceId,
      userId: params.userId,
    },
    idempotenceKey,
    returnUrl: params.returnUrl,
    confirmation: params.confirmation,
    savePaymentMethod: true,
    receipt,
  });

  // 6. Обновляем Payment с ID от ЮKassa
  await db.payment.update({
    where: { id: payment.id },
    data: {
      providerPaymentId: ykPayment.id,
      confirmationUrl: ykPayment.confirmation?.confirmation_url ?? null,
      requiresCapture: ykPayment.status === 'waiting_for_capture',
    },
  });

  return {
    payment: ykPayment,
    confirmationUrl: ykPayment.confirmation?.confirmation_url ?? null,
  };
}

// ... другие функции: upgradeSubscription, cancelSubscription, etc.
```

### 2.10. ENV-переменные

```bash
# .env.local

# ЮKassa
YOOKASSA_SHOP_ID=12345
YOOKASSA_SECRET_KEY=live_xxxxxxxxxxxxxxxxxxxx

# Для тестирования: тестовые ключи отдельно
# YOOKASSA_SHOP_ID=test_12345
# YOOKASSA_SECRET_KEY=test_xxxxxxxxxxxxxxxxxxxx

# Webhook URL (настраивается в ЛК ЮKassa)
# https://app.komplid.ru/api/webhooks/yookassa

# ФЗ-54 / Чеки от ЮKassa
YOOKASSA_RECEIPTS_ENABLED=true
YOOKASSA_VAT_CODE=1              # 1 = Без НДС (ИП на УСН). При переходе: 7=22%, 8=22/122

# Налоговый режим
TAX_REGIME=USN_INCOME_6          # USN_INCOME_6 | USN_INCOME_EXPENSE_15 | AUSN | OSNO
TAX_VAT_EXEMPT=true              # true пока ИП на УСН и выручка < 20 млн/год
TAX_MINCIFRY_REGISTERED=false    # станет true после включения в реестр Минцифры
TAX_ANNUAL_LIMIT_WARNING_RUB=1600000000   # 16 млн ₽ (80% от 20 млн) — порог алертов

# Получатель (реквизиты ИП для чеков, оферты, счетов)
COMPANY_TYPE=IP                  # IP | OOO
COMPANY_NAME="ИП Фамилия Имя Отчество"
COMPANY_INN=770000000000         # 12-значный ИНН ИП (у ООО — 10 знаков)
COMPANY_OGRNIP=320770000000000   # ОГРНИП (у ООО — ОГРН)
COMPANY_ADDRESS="Адрес регистрации ИП"
COMPANY_EMAIL=hello@komplid.ru
COMPANY_BANK_ACCOUNT=40802810...
COMPANY_BANK_NAME="АО Тинькофф Банк"
COMPANY_BANK_BIC=044525974
COMPANY_CORR_ACCOUNT=30101810145250000974
```

---

## 3. Экономика тарифов

### 3.1. Полный каталог планов

Все цены актуальны на апрель 2026. В БД храним в копейках (`priceRub: Int`).

#### B2C Профи-пакеты

**Сметчик-Студио (targetRole = SMETCHIK):**

| Тариф | Месяц | Год (−20%) | Лимиты |
|-------|-------|-----------|--------|
| **Freemium** | 0 ₽ | — | 5 смет в месяц, до 3 активных смет, без сравнения версий, без публичных ссылок |
| **Базовый** | 1 900 ₽ | 18 240 ₽/год | 20 смет/мес, до 10 активных, базовое сравнение версий, без ФГИС ЦС |
| **Pro** | 2 900 ₽ | 27 840 ₽/год | Безлимит смет, продвинутое сравнение, публичные ссылки, ФГИС ЦС, до 10 гостей |

**Features JSON (Pro Сметчик):**
```json
["estimate_import_xml", "estimate_import_excel", "estimate_import_pdf",
 "estimate_compare_advanced", "estimate_public_link", "fgis_cs",
 "estimate_export_xml", "guest_access", "voice_input"]
```

**ИД-Мастер (targetRole = PTO):**

| Тариф | Месяц | Год | Лимиты |
|-------|-------|-----|--------|
| **Freemium** | 0 ₽ | — | 10 АОСР/мес, 1 объект, без ЭЦП-маршрутов, без ОЖР |
| **Базовый** | 1 900 ₽ | 18 240 ₽ | 50 АОСР/мес, 1 объект, ОЖР, базовые шаблоны 344/пр |
| **Pro** | 2 900 ₽ | 27 840 ₽ | Безлимит АОСР, 5 объектов, маршруты с ЭЦП, КС-2/КС-3, XML для ИСУП |

**Прораб-Журнал (targetRole = PRORAB):**

| Тариф | Месяц | Год | Лимиты |
|-------|-------|-----|--------|
| **Freemium** | 0 ₽ | — | 1 объект, 30 записей ОЖР/мес, фото без GPS |
| **Базовый** | 1 900 ₽ | 18 240 ₽ | 3 объекта, голосовой ввод, фото с GPS, дефекты |
| **Pro** | 2 900 ₽ | 27 840 ₽ | 10 объектов, автогенерация АОСР из ОЖР, push-уведомления, геозоны |

#### B2B Team-пакеты

| Тариф | Месяц | Год | Лимиты |
|-------|-------|-----|--------|
| **Старт** | 12 000 ₽ | 115 200 ₽ | 10 польз, 1 объект, 50 ГБ, все 18 модулей, без ЭЦП-маршрутов |
| **Команда** | 48 000 ₽ | 460 800 ₽ | 50 польз, 10 объектов, 1 ТБ, ЭЦП, ТИМ, 1С/Гранд, SLA 8×5 |
| **Корпоративный** | от 200 000 ₽ | индивид | Безлимит, on-premise, SSO, SLA 24×7, кастомизация |

**Пропорция цен:** B2B в 6-25× дороже B2C — нормально для SaaS, так как B2B покрывает несколько ролей и даёт командную работу, которая B2C не покрывает.

### 3.2. Конкретные лимиты Freemium — как определить

Цель Freemium — **довести до момента, когда ценность очевидна, и остановиться**. Слишком узкий лимит = пользователь бросит. Слишком широкий = не купит платный.

**Принципы для каждой роли:**

**Сметчик Freemium — цель: попробовать сравнение версий**
- 5 смет в месяц — достаточно, чтобы сравнить старую и новую версию на 2-3 проектах
- 3 активные сметы — ограничение на количество параллельных проектов
- Без публичных ссылок — блок главной виральной фичи
- Лимит попадания на ценность: обычно на 2-3 неделе использования

**ПТО Freemium — цель: попробовать автогенерацию АОСР**
- 10 АОСР/мес — 2-3 АОСР в неделю, средняя загрузка мелкого объекта
- 1 объект — лимит на масштабирование
- Без ЭЦП-маршрутов — главный блок: для реальной сдачи нужно подписание
- Лимит попадания на ценность: на 2-4 неделе

**Прораб Freemium — цель: привыкнуть к мобильному вводу ОЖР**
- 30 записей ОЖР/мес — 1 запись в день на активном объекте
- 1 объект — прораб с одним объектом может работать бесплатно, но если два — нужен платный
- Фото без GPS — блок фичи, важной для инспекторов
- Лимит попадания на ценность: в конце первого месяца

**B2B Freemium тарифа НЕ ДЕЛАЕМ.** Для компаний из СРО (105 тыс.) — только платный вход от 12 000 ₽/мес, либо триал на 14 дней. Причина: в B2B Freemium не конвертируется — компании готовы платить за инструмент для команды.

### 3.3. Триал и его экономика

**Правила:**
- Триал = **полный Pro-уровень** на 14 дней без карты
- Только для новых пользователей (workspace моложе 14 дней)
- Один раз на workspace
- На 15-й день:
  - Если карта привязана → автосписание
  - Если нет → автоматический переход на Freemium
- За 3 дня до окончания — email-напоминание
- За 1 день — push-уведомление в PWA

**Код логики в `lib/payments/trial-service.ts`:**
```typescript
export async function startTrial(params: {
  workspaceId: string;
  userId: string;
  trialPlanId: string;
}) {
  // Проверяем что workspace ещё не использовал триал
  const existingTrial = await db.subscription.findFirst({
    where: {
      workspaceId: params.workspaceId,
      status: SubscriptionStatus.TRIALING,
    },
  });
  if (existingTrial) throw new Error('Trial already used');

  const plan = await db.subscriptionPlan.findUniqueOrThrow({
    where: { id: params.trialPlanId },
  });

  const trialStart = new Date();
  const trialEnd = new Date(trialStart.getTime() + plan.trialDays * 24 * 60 * 60 * 1000);

  const subscription = await db.subscription.create({
    data: {
      workspaceId: params.workspaceId,
      planId: params.trialPlanId,
      status: SubscriptionStatus.TRIALING,
      startedAt: trialStart,
      currentPeriodStart: trialStart,
      currentPeriodEnd: trialEnd,
      trialStart,
      trialEnd,
      autoRenew: false,  // при триале без карты — не продлеваем
    },
  });

  await db.subscriptionEvent.create({
    data: {
      subscriptionId: subscription.id,
      type: SubscriptionEventType.TRIAL_STARTED,
      actorType: ActorType.USER,
      actorUserId: params.userId,
      payload: { trialDays: plan.trialDays },
    },
  });

  // Запланировать напоминания через BullMQ
  await queueTrialReminder(subscription.id, 3 * 24 * 60 * 60 * 1000);  // за 3 дня
  await queueTrialReminder(subscription.id, 1 * 24 * 60 * 60 * 1000);  // за 1 день
  await queueTrialExpiration(subscription.id, plan.trialDays * 24 * 60 * 60 * 1000);

  return subscription;
}
```

### 3.4. Proration — пропорциональная доплата при апгрейде

**Сценарий:** пользователь на Базовом (1 900 ₽/мес), заплатил 10-го числа, подписка до 10-го следующего. 20-го числа хочет Pro (2 900 ₽/мес).

**Расчёт:**
- Осталось дней в текущем периоде: `daysRemaining = Math.ceil((periodEnd - now) / 86400000)` = ~20 дней
- Всего дней в периоде: `totalDays = 30`
- Неиспользованная сумма старого плана: `unusedOld = 1900 * (daysRemaining / totalDays)` ≈ 1 267 ₽
- Стоимость нового плана за эти же дни: `costNew = 2900 * (daysRemaining / totalDays)` ≈ 1 933 ₽
- **К оплате: 1 933 − 1 267 = 666 ₽**

**Код `lib/payments/proration.ts`:**

```typescript
export interface ProrationResult {
  daysRemaining: number;
  totalDaysInPeriod: number;
  unusedCreditRub: number;  // в копейках
  newPlanCostForRemainingRub: number;
  amountToChargeRub: number;
  newPeriodEnd: Date;
}

export function calculateProration(params: {
  currentPlanPriceRub: number;   // цена текущего плана за период, копейки
  newPlanPriceRub: number;       // цена нового плана за период, копейки
  periodStart: Date;
  periodEnd: Date;
  upgradeAt?: Date;              // default = now
}): ProrationResult {
  const now = params.upgradeAt ?? new Date();

  const periodMs = params.periodEnd.getTime() - params.periodStart.getTime();
  const remainingMs = Math.max(0, params.periodEnd.getTime() - now.getTime());

  const totalDaysInPeriod = Math.round(periodMs / 86400000);
  const daysRemaining = Math.ceil(remainingMs / 86400000);

  const ratio = daysRemaining / totalDaysInPeriod;

  // Копейки, округляем вниз для пользы пользователю
  const unusedCreditRub = Math.floor(params.currentPlanPriceRub * ratio);
  const newPlanCostForRemainingRub = Math.ceil(params.newPlanPriceRub * ratio);

  const amountToChargeRub = Math.max(0, newPlanCostForRemainingRub - unusedCreditRub);

  return {
    daysRemaining,
    totalDaysInPeriod,
    unusedCreditRub,
    newPlanCostForRemainingRub,
    amountToChargeRub,
    newPeriodEnd: params.periodEnd,  // остаётся прежний, просто теперь по новому плану
  };
}
```

**Сервис апгрейда:**

```typescript
// src/lib/payments/upgrade-service.ts
import { calculateProration } from './proration';
import { db } from '@/lib/db';
import { createPayment } from './yookassa/payments';

export async function upgradeSubscription(params: {
  subscriptionId: string;
  newPlanId: string;
  userId: string;
  returnUrl: string;
}) {
  const sub = await db.subscription.findUniqueOrThrow({
    where: { id: params.subscriptionId },
    include: { plan: true, workspace: true, defaultPaymentMethod: true },
  });
  const newPlan = await db.subscriptionPlan.findUniqueOrThrow({ where: { id: params.newPlanId } });

  // Валидации:
  if (newPlan.priceRub <= sub.plan.priceRub) {
    throw new Error('Only upgrades allowed (new plan must cost more)');
  }
  if (newPlan.billingPeriod !== sub.plan.billingPeriod) {
    throw new Error('Cannot change billing period during upgrade');
  }

  // Расчёт proration
  const proration = calculateProration({
    currentPlanPriceRub: sub.plan.priceRub,
    newPlanPriceRub: newPlan.priceRub,
    periodStart: sub.currentPeriodStart,
    periodEnd: sub.currentPeriodEnd,
  });

  // Создаём PRORATION-платёж
  const { randomUUID } = await import('crypto');
  const idempotenceKey = randomUUID();

  const payment = await db.payment.create({
    data: {
      workspaceId: sub.workspaceId,
      subscriptionId: sub.id,
      userId: params.userId,
      type: 'PLAN_UPGRADE',
      amountRub: proration.amountToChargeRub,
      description: `Апгрейд ${sub.plan.name} → ${newPlan.name}`,
      status: 'PENDING',
      provider: 'YOOKASSA',
      providerIdempotenceKey: idempotenceKey,
      metadata: {
        fromPlanId: sub.planId,
        toPlanId: newPlan.id,
        prorationDetails: proration,
      },
    },
  });

  // Списываем с сохранённой карты — без редиректа
  if (sub.defaultPaymentMethod) {
    const { chargeRecurring } = await import('./yookassa/payments');
    const ykPayment = await chargeRecurring({
      paymentMethodId: sub.defaultPaymentMethod.providerMethodId,
      amount: { value: (proration.amountToChargeRub / 100).toFixed(2), currency: 'RUB' },
      description: payment.description,
      metadata: { paymentDbId: payment.id, subscriptionId: sub.id },
      idempotenceKey,
    });
    await db.payment.update({
      where: { id: payment.id },
      data: { providerPaymentId: ykPayment.id },
    });
  } else {
    // Нет сохранённой карты — создаём checkout-платёж
    const ykPayment = await createPayment({
      amount: { value: (proration.amountToChargeRub / 100).toFixed(2), currency: 'RUB' },
      description: payment.description,
      metadata: { paymentDbId: payment.id, subscriptionId: sub.id },
      idempotenceKey,
      returnUrl: params.returnUrl,
      savePaymentMethod: true,
    });
    await db.payment.update({
      where: { id: payment.id },
      data: { providerPaymentId: ykPayment.id, confirmationUrl: ykPayment.confirmation?.confirmation_url },
    });

    return { payment: ykPayment, confirmationUrl: ykPayment.confirmation?.confirmation_url ?? null };
  }

  // Подписку обновим в handleSuccessfulPayment после webhook
  return { payment: null, confirmationUrl: null };
}
```

### 3.5. Downgrade — даунгрейд

**Политика:**
- Даунгрейд **не даёт возврата** денег, эффект — с конца текущего периода
- При даунгрейде фиксируется `pendingPlanId` и `pendingPlanChangeAt = currentPeriodEnd`
- При продлении cron-джоба проверяет `pendingPlanChangeAt` и применяет новый план

**Ограничения:**
- Если данные workspace превышают лимиты нового плана — **не блокируем downgrade**, но:
  - В UI показываем warning с конкретными нарушениями: «У вас 3 активных объекта, новый тариф допускает только 1. При переходе 2 лишних объекта перейдут в архив (readonly).»
  - После применения — автоматически archive на данные сверх лимита (с возможностью восстановить при апгрейде)

```typescript
export async function scheduleDowngrade(params: {
  subscriptionId: string;
  newPlanId: string;
  userId: string;
}) {
  const sub = await db.subscription.findUniqueOrThrow({
    where: { id: params.subscriptionId },
    include: { plan: true },
  });
  const newPlan = await db.subscriptionPlan.findUniqueOrThrow({ where: { id: params.newPlanId } });

  if (newPlan.priceRub >= sub.plan.priceRub) {
    throw new Error('Use upgrade flow for same price or higher plans');
  }

  await db.subscription.update({
    where: { id: sub.id },
    data: {
      pendingPlanId: params.newPlanId,
      pendingPlanChangeAt: sub.currentPeriodEnd,
    },
  });

  await db.subscriptionEvent.create({
    data: {
      subscriptionId: sub.id,
      type: SubscriptionEventType.PLAN_CHANGE_SCHEDULED,
      actorType: ActorType.USER,
      actorUserId: params.userId,
      payload: { fromPlanId: sub.planId, toPlanId: params.newPlanId, effectiveAt: sub.currentPeriodEnd },
    },
  });

  // Email: "Ваш тариф изменится с [дата]"
  // ...
}
```

### 3.6. Смена биллингового периода (мес → год)

**Сценарий:** на Базовом месячном (1 900 ₽/мес), хочет перейти на Базовый годовой (18 240 ₽/год, скидка 20%).

**Логика:**
- Это считаем как upgrade-flow с proration, но с учётом что новый плен = годовой
- Proration: осталось `X` дней месячного, credit = `1900 * X / 30`
- К оплате: `18 240 − credit`
- Новый period_end = `now + 1 год`

### 3.7. Grace Period — после окончания подписки

**Цель:** дать пользователю 7 дней, чтобы прийти в себя и восстановить оплату, но не удалять данные.

**Автомат состояний:**

```
ACTIVE → [период закончился + карта не списалась]
         ↓
      PAST_DUE [начинаем dunning]
         ↓
      [3 попытки списания в течение 3 дней не удались]
         ↓
      GRACE [7 дней readonly]
         ↓
      EXPIRED [полностью закрыт доступ кроме /settings/billing]
```

**Что происходит в каждом статусе:**

- **ACTIVE** — полный доступ, автопродление включено
- **PAST_DUE** — полный доступ, показываем красный баннер «Оплата не прошла, обновите карту»
- **GRACE** — readonly. Пользователь может:
  - Просматривать свои данные
  - Экспортировать их в PDF/XLSX
  - Управлять биллингом (сменить карту, заплатить, выбрать другой тариф)
  - **НЕ может:** создавать/редактировать/удалять любые сущности
- **EXPIRED** — блок всего кроме `/settings/billing`. После 30 дней EXPIRED — данные помечаются для архивации (но не удаляются ещё 90 дней).

**Cron-джобы (BullMQ, каждый час):**

```typescript
// queue: subscription-lifecycle

// Каждый час
export async function processExpiringSubscriptions() {
  const now = new Date();

  // 1. ACTIVE → PAST_DUE — период закончился
  const toPastDue = await db.subscription.findMany({
    where: {
      status: 'ACTIVE',
      currentPeriodEnd: { lt: now },
      autoRenew: true,
    },
  });
  for (const sub of toPastDue) {
    await startDunning(sub.id);
  }

  // 2. ACTIVE без autoRenew → GRACE
  const toGraceFromActive = await db.subscription.findMany({
    where: {
      status: 'ACTIVE',
      currentPeriodEnd: { lt: now },
      autoRenew: false,
    },
  });
  for (const sub of toGraceFromActive) {
    await transitionToGrace(sub.id);
  }

  // 3. CANCELLED (у которых effectiveEndDate наступил) → EXPIRED
  const toExpiredFromCancelled = await db.subscription.findMany({
    where: {
      status: 'CANCELLED',
      effectiveEndDate: { lt: now },
    },
  });
  for (const sub of toExpiredFromCancelled) {
    await transitionToExpired(sub.id);
  }

  // 4. GRACE + graceUntil прошёл → EXPIRED
  const toExpiredFromGrace = await db.subscription.findMany({
    where: {
      status: 'GRACE',
      graceUntil: { lt: now },
    },
  });
  for (const sub of toExpiredFromGrace) {
    await transitionToExpired(sub.id);
  }
}

async function transitionToGrace(subId: string) {
  const graceDays = 7;
  const graceUntil = new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000);

  await db.subscription.update({
    where: { id: subId },
    data: {
      status: SubscriptionStatus.GRACE,
      graceUntil,
    },
  });

  await db.subscriptionEvent.create({
    data: {
      subscriptionId: subId,
      type: SubscriptionEventType.GRACE_STARTED,
      actorType: ActorType.SYSTEM,
      payload: { graceUntil, graceDays },
    },
  });

  // Email пользователю с инструкцией
  // ...
}
```

### 3.8. Dunning — серия попыток списания

**Расписание retry (стандарт индустрии):**
1. День 0 (период закончился): первая попытка
2. Если не прошла → День +1: вторая попытка
3. День +3: третья попытка
4. День +5: четвёртая попытка
5. День +7: последняя попытка

После 5 попыток → карта помечается как `deactivationReason='failed_too_many_times'`, подписка → GRACE.

Между попытками — **email пользователю**:
- После 1-го фейла: «Не удалось списать оплату. Проверьте карту.»
- После 3-го: «Последняя попытка через 2 дня. Обновите карту, чтобы не потерять доступ.»
- После 5-го: «Доступ ограничен. 7 дней на восстановление.»

```typescript
// src/lib/payments/dunning-service.ts

const DUNNING_SCHEDULE_DAYS = [0, 1, 3, 5, 7];

export async function startDunning(subscriptionId: string) {
  const sub = await db.subscription.findUniqueOrThrow({
    where: { id: subscriptionId },
    include: { defaultPaymentMethod: true, plan: true },
  });

  if (!sub.defaultPaymentMethod) {
    // Нет сохранённой карты — сразу в GRACE
    await transitionToGrace(sub.id);
    return;
  }

  // Первая попытка — сразу
  await attemptDunningCharge(sub.id, 1);
}

export async function attemptDunningCharge(subscriptionId: string, attemptNumber: number) {
  const sub = await db.subscription.findUniqueOrThrow({
    where: { id: subscriptionId },
    include: { defaultPaymentMethod: true, plan: true },
  });

  const attempt = await db.dunningAttempt.create({
    data: {
      subscriptionId: sub.id,
      attemptNumber,
      scheduledAt: new Date(),
      executedAt: new Date(),
    },
  });

  try {
    const { chargeRecurring } = await import('./yookassa/payments');
    const { randomUUID } = await import('crypto');

    const payment = await db.payment.create({
      data: {
        workspaceId: sub.workspaceId,
        subscriptionId: sub.id,
        userId: sub.workspace.ownerId,  // формально инициатор — владелец
        type: 'PLAN_RENEWAL',
        amountRub: sub.plan.priceRub,
        description: `Автосписание: ${sub.plan.name}`,
        status: 'PENDING',
        providerIdempotenceKey: randomUUID(),
      },
    });

    const ykPayment = await chargeRecurring({
      paymentMethodId: sub.defaultPaymentMethod!.providerMethodId,
      amount: { value: (sub.plan.priceRub / 100).toFixed(2), currency: 'RUB' },
      description: payment.description,
      metadata: { paymentDbId: payment.id, subscriptionId: sub.id },
      idempotenceKey: payment.providerIdempotenceKey,
    });

    await db.dunningAttempt.update({
      where: { id: attempt.id },
      data: { paymentId: payment.id, result: null },  // результат придёт через webhook
    });

    // Статус подписки оставляем PAST_DUE, webhook либо подтвердит, либо пометит failure

  } catch (err) {
    await db.dunningAttempt.update({
      where: { id: attempt.id },
      data: {
        result: 'FAILED',
        failureReason: String(err),
      },
    });

    await scheduleNextDunningAttempt(sub.id, attemptNumber);
  }
}

export async function scheduleNextDunningAttempt(subId: string, currentAttemptNumber: number) {
  const nextAttemptIndex = currentAttemptNumber;  // 1 → index 1 → день 1; 2 → index 2 → день 3
  if (nextAttemptIndex >= DUNNING_SCHEDULE_DAYS.length) {
    // Превышено количество попыток
    await transitionToGrace(subId);
    return;
  }

  const delayDays = DUNNING_SCHEDULE_DAYS[nextAttemptIndex];
  const nextAt = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000);

  await db.subscription.update({
    where: { id: subId },
    data: {
      nextDunningAt: nextAt,
      dunningAttempts: currentAttemptNumber,
    },
  });

  // Отправить email
  await sendDunningFailureEmail(subId, currentAttemptNumber);
}
```

### 3.9. Отмена подписки

**Политика:** отмена эффективна с конца текущего периода, возвратов не делаем (кроме ошибки платежа в первые 14 дней).

**Варианты интерфейса:**
1. **Мягкая отмена** — "не продлевать на следующий период". Работает до конца оплаченного периода, потом EXPIRED. Основной вариант.
2. **Жёсткая отмена** — "закрыть сейчас и вернуть пропорционально". Пока **не делаем** — усложнение и риск.

```typescript
export async function cancelSubscription(params: {
  subscriptionId: string;
  userId: string;
  reason?: CancellationReasonCode;
  feedback?: string;
}) {
  const sub = await db.subscription.findUniqueOrThrow({
    where: { id: params.subscriptionId },
  });

  if (sub.status !== 'ACTIVE' && sub.status !== 'TRIALING') {
    throw new Error('Only active subscriptions can be cancelled');
  }

  await db.subscription.update({
    where: { id: sub.id },
    data: {
      status: SubscriptionStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: params.reason,
      cancelFeedback: params.feedback,
      effectiveEndDate: sub.currentPeriodEnd,  // действует до конца периода
      autoRenew: false,                        // отключаем автопродление
    },
  });

  await db.subscriptionEvent.create({
    data: {
      subscriptionId: sub.id,
      type: SubscriptionEventType.CANCELLED,
      actorType: ActorType.USER,
      actorUserId: params.userId,
      payload: {
        reason: params.reason,
        feedback: params.feedback,
        effectiveEndDate: sub.currentPeriodEnd,
      },
    },
  });

  // Email подтверждения
  // Email через 3 дня с retention-оффером (если была TOO_EXPENSIVE)
}

export async function reactivateSubscription(params: {
  subscriptionId: string;
  userId: string;
}) {
  const sub = await db.subscription.findUniqueOrThrow({
    where: { id: params.subscriptionId },
  });

  if (sub.status !== 'CANCELLED') {
    throw new Error('Only cancelled subscriptions can be reactivated');
  }
  if (sub.effectiveEndDate && sub.effectiveEndDate < new Date()) {
    throw new Error('Subscription has already expired, create a new one');
  }

  await db.subscription.update({
    where: { id: sub.id },
    data: {
      status: SubscriptionStatus.ACTIVE,
      cancelledAt: null,
      cancelReason: null,
      effectiveEndDate: null,
      autoRenew: true,
    },
  });

  await db.subscriptionEvent.create({
    data: {
      subscriptionId: sub.id,
      type: SubscriptionEventType.REACTIVATED,
      actorType: ActorType.USER,
      actorUserId: params.userId,
      payload: {},
    },
  });
}
```

### 3.10. Промокоды — логика применения

**Типы:**
- `PERCENT` — скидка % на первую оплату (30, 50)
- `FIXED_AMOUNT` — скидка фиксированная в ₽
- `TRIAL_DAYS` — продление триала (разовый бонус: 14 → 30 дней)
- `FREE_MONTHS` — первые N месяцев бесплатно

**Применимость:**
- По умолчанию промокод применяется только на **первый платёж**
- Если `isFirstPaymentOnly: false` — применяется на каждое продление, пока действует
- Ограничение на workspace: один workspace может использовать один промокод (по умолчанию)

**Реализация:**

```typescript
// src/lib/payments/promo-service.ts

export async function validateAndApplyPromoCode(
  code: string,
  workspaceId: string,
  plan: SubscriptionPlan
): Promise<{
  promoCodeId: string;
  discountRub: number;
  finalAmountRub: number;
}> {
  const promo = await db.promoCode.findUnique({
    where: { code: code.toUpperCase() },
    include: { applicableToPlans: true },
  });

  if (!promo) throw new Error('PROMO_NOT_FOUND');

  // Проверка срока
  const now = new Date();
  if (promo.validFrom > now) throw new Error('PROMO_NOT_YET_VALID');
  if (promo.validUntil && promo.validUntil < now) throw new Error('PROMO_EXPIRED');

  // Лимит использований
  if (promo.maxTotalRedemptions && promo.redemptionsCount >= promo.maxTotalRedemptions) {
    throw new Error('PROMO_LIMIT_REACHED');
  }

  // Применимость к плану
  if (promo.applicableToPlans.length > 0) {
    const applicable = promo.applicableToPlans.some((rule) => rule.planId === plan.id);
    if (!applicable) throw new Error('PROMO_NOT_APPLICABLE_TO_PLAN');
  }

  if (promo.applicableToCategories.length > 0) {
    if (!promo.applicableToCategories.includes(plan.category)) {
      throw new Error('PROMO_NOT_APPLICABLE_TO_CATEGORY');
    }
  }

  // Ограничение на workspace
  const redemption = await db.promoCodeRedemption.findUnique({
    where: { promoCodeId_workspaceId: { promoCodeId: promo.id, workspaceId } },
  });
  if (redemption) throw new Error('PROMO_ALREADY_USED_IN_WORKSPACE');

  // Рассчитываем скидку
  let discountRub = 0;
  switch (promo.discountType) {
    case 'PERCENT': {
      discountRub = Math.floor(plan.priceRub * (promo.discountValue / 100));
      if (promo.maxDiscountRub) {
        discountRub = Math.min(discountRub, promo.maxDiscountRub);
      }
      break;
    }
    case 'FIXED_AMOUNT': {
      discountRub = promo.discountValue;
      break;
    }
    case 'TRIAL_DAYS':
    case 'FREE_MONTHS':
      // Эти типы — отдельная логика, не дают скидку на первый платёж
      discountRub = 0;
      break;
  }

  const finalAmountRub = Math.max(0, plan.priceRub - discountRub);

  return {
    promoCodeId: promo.id,
    discountRub,
    finalAmountRub,
  };
}
```

### 3.11. Реферальные кредиты — как они конвертируются в скидки

Из Модуля 15 Фазы 5 у нас есть `WorkspaceCredit` и `CreditLedgerEntry`. Рефералы накапливают кредиты, которые нужно применять к платежам.

**Правило:** при создании платежа кредиты автоматически применяются к сумме (но не более `plan.priceRub`).

```typescript
export async function applyCreditsToPayment(params: {
  workspaceId: string;
  paymentAmountRub: number;
  paymentId: string;
}): Promise<{ appliedRub: number; newAmountRub: number }> {
  const credit = await db.workspaceCredit.findUnique({
    where: { workspaceId: params.workspaceId },
  });

  if (!credit || credit.balanceRub === 0) {
    return { appliedRub: 0, newAmountRub: params.paymentAmountRub };
  }

  // Применяем не больше суммы платежа (чтобы не «сжечь» много)
  const appliedRub = Math.min(credit.balanceRub, params.paymentAmountRub);
  const newAmountRub = params.paymentAmountRub - appliedRub;

  await db.$transaction(async (tx) => {
    await tx.workspaceCredit.update({
      where: { workspaceId: params.workspaceId },
      data: { balanceRub: { decrement: appliedRub } },
    });

    await tx.creditLedgerEntry.create({
      data: {
        workspaceId: params.workspaceId,
        type: 'DEBIT',
        amountRub: appliedRub,
        balanceAfterRub: credit.balanceRub - appliedRub,
        description: `Применено к платежу #${params.paymentId}`,
        paymentId: params.paymentId,
      },
    });
  });

  return { appliedRub, newAmountRub };
}
```

### 3.12. Unit-экономика — что считать

Для dashboard `/admin/metrics` (заменяет Фазу 8.3 Модуля 15):

```typescript
interface SubscriptionMetrics {
  // Acquisition
  newSubscriptionsThisMonth: number;
  trialsStartedThisMonth: number;
  trialConversionRate: number;                 // % триалов → платящих

  // Activation
  timeToFirstValueDays: number;                // медиана

  // Revenue
  mrrRub: number;                              // Monthly Recurring Revenue
  arrRub: number;                              // Annual Recurring Revenue
  arpaRub: number;                             // Average Revenue Per Account
  paidSubscriptionsActive: number;

  // Retention
  churnRateMonthly: number;                    // % MRR потерянного в месяц
  grossRevenueRetention: number;               // % удержанной выручки без апгрейдов
  netRevenueRetention: number;                 // % удержанной с учётом апгрейдов

  // Expansion
  upgradesThisMonth: number;
  mrrFromUpgradesRub: number;

  // Dunning
  pastDueSubscriptionsCount: number;
  dunningRecoveryRate: number;                 // % PAST_DUE вернувшихся в ACTIVE

  // Per plan
  byPlan: Record<string, { count: number; mrrRub: number }>;
}
```

### 3.13. Мониторинг налогового порога (для ИП на УСН)

Поскольку при пересечении порога 20 млн ₽ годовой выручки ИП на УСН автоматически становится плательщиком НДС (если нет льготы Минцифры), это **критично отслеживать в реальном времени**.

#### 3.13.1. Модель TaxYearStats

Агрегированная статистика по годам. Обновляется cron-джобой раз в сутки (или при каждом успешном платеже для real-time режима).

```prisma
/// Сводная налоговая статистика по годам.
/// Обновляется каждый день в 00:00 Мск или при каждом succeeded-платеже.
model TaxYearStats {
  year              Int           @id                // 2026, 2027, ...

  // Выручка нарастающим итогом
  revenueRub        Int           @default(0)        // всего получено за год
  revenueByMonth    Json          @default("{}")     // { "01": 123456, "02": 234567, ... } в копейках

  // Лимит для освобождения от НДС
  vatExemptionLimit Int                              // 20_000_000_00 для 2026, 15_000_000_00 для 2027
  usedPercent       Float                            // revenueRub / vatExemptionLimit * 100

  // Налоговый режим на момент года
  regime            TaxRegime     @default(USN_INCOME_6)
  mincifryExempt    Boolean       @default(false)    // есть ли льгота по Минцифре

  // Алерты
  alert80Sent       Boolean       @default(false)    // отправлен алерт на 80%
  alert100Sent      Boolean       @default(false)    // порог превышен
  alert80SentAt     DateTime?
  alert100SentAt    DateTime?

  lastUpdatedAt     DateTime      @updatedAt

  @@map("tax_year_stats")
}

enum TaxRegime {
  USN_INCOME_6           // УСН «Доходы» 6%
  USN_INCOME_EXPENSE_15  // УСН «Доходы минус расходы» 15%
  AUSN                   // Автоматизированная УСН
  OSNO                   // Общая система с НДС
}
```

#### 3.13.2. Cron-джоба обновления статистики

Раз в сутки (ночью, когда минимум нагрузки) пересчитывает статистику текущего года.

```typescript
// src/jobs/update-tax-stats.ts

import { db } from '@/lib/db';
import { getYearExemptionLimit } from '@/lib/tax/limits';

export async function updateTaxYearStats() {
  const year = new Date().getUTCFullYear();

  // 1. Суммируем все succeeded платежи за год
  const paymentsAgg = await db.payment.aggregate({
    where: {
      status: 'SUCCEEDED',
      paidAt: {
        gte: new Date(`${year}-01-01T00:00:00Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00Z`),
      },
    },
    _sum: { amountRub: true },
  });

  const revenueRub = paymentsAgg._sum.amountRub ?? 0;

  // 2. По месяцам
  const byMonth: Record<string, number> = {};
  const monthlyAgg = await db.$queryRaw<Array<{ month: number; sum: bigint }>>`
    SELECT EXTRACT(MONTH FROM "paidAt")::int AS month, SUM("amountRub") AS sum
    FROM "payments"
    WHERE "status" = 'SUCCEEDED'
      AND "paidAt" >= ${new Date(`${year}-01-01T00:00:00Z`)}
      AND "paidAt" < ${new Date(`${year + 1}-01-01T00:00:00Z`)}
    GROUP BY EXTRACT(MONTH FROM "paidAt")
  `;
  monthlyAgg.forEach((row) => {
    byMonth[String(row.month).padStart(2, '0')] = Number(row.sum);
  });

  // 3. Лимит освобождения на этот год
  const limit = getYearExemptionLimit(year);
  const percent = limit > 0 ? (revenueRub / limit) * 100 : 0;

  // 4. Upsert
  const existing = await db.taxYearStats.findUnique({ where: { year } });

  const updated = await db.taxYearStats.upsert({
    where: { year },
    create: {
      year,
      revenueRub,
      revenueByMonth: byMonth,
      vatExemptionLimit: limit,
      usedPercent: percent,
      regime: 'USN_INCOME_6',
      mincifryExempt: process.env.TAX_MINCIFRY_REGISTERED === 'true',
    },
    update: {
      revenueRub,
      revenueByMonth: byMonth,
      vatExemptionLimit: limit,
      usedPercent: percent,
    },
  });

  // 5. Алерты
  if (percent >= 80 && !existing?.alert80Sent) {
    await sendTaxAlert(year, 80, revenueRub, limit);
    await db.taxYearStats.update({
      where: { year },
      data: { alert80Sent: true, alert80SentAt: new Date() },
    });
  }

  if (percent >= 100 && !existing?.alert100Sent) {
    await sendTaxAlert(year, 100, revenueRub, limit);
    await db.taxYearStats.update({
      where: { year },
      data: { alert100Sent: true, alert100SentAt: new Date() },
    });
  }

  return updated;
}

/// Лимит для освобождения от НДС на УСН по годам
export function getYearExemptionLimit(year: number): number {
  // Закон ФЗ №425 от 28.11.2025 постепенно снижает лимит
  const limits: Record<number, number> = {
    2026: 20_000_000_00,  // 20 млн ₽ в копейках
    2027: 15_000_000_00,  // 15 млн ₽
    2028: 10_000_000_00,  // 10 млн ₽
  };
  return limits[year] ?? 10_000_000_00;  // по умолчанию — самый строгий
}

async function sendTaxAlert(year: number, percent: 80 | 100, revenueRub: number, limitRub: number) {
  const to = process.env.TAX_ALERT_EMAIL ?? process.env.COMPANY_EMAIL;
  const subject = percent === 80
    ? `⚠️ Komplid: выручка ${year} достигла 80% порога НДС`
    : `🚨 Komplid: порог НДС за ${year} превышен`;

  const body = percent === 80
    ? `Текущая выручка ${(revenueRub / 100).toLocaleString('ru-RU')} ₽ из лимита ${(limitRub / 100).toLocaleString('ru-RU')} ₽ (80%).
       Рекомендация: если ещё не поданы документы в реестр Минцифры — начать процесс.
       Срок рассмотрения до 45 рабочих дней.`
    : `Выручка ${(revenueRub / 100).toLocaleString('ru-RU')} ₽ превысила лимит.
       С первого числа следующего месяца возникает обязанность уплаты НДС.
       СРОЧНО: выбрать ставку (5% без вычетов или 22% с вычетами) и обновить YOOKASSA_VAT_CODE.`;

  await sendEmail({ to, subject, body });
}
```

#### 3.13.3. Admin-виджет мониторинга порога

В `/admin/billing` добавляется виджет «Налоговая нагрузка» в верхней части дашборда.

**Содержимое виджета:**

- Большая цифра: выручка текущего года (`3 420 000 ₽`)
- Прогресс-бар: `17%` от лимита 20 000 000 ₽
- Цвет прогресс-бара: зелёный <50%, жёлтый 50-80%, оранжевый 80-100%, красный >100%
- Подпись: «До достижения лимита 20 млн ₽ ≈ 8.4 месяца при текущих темпах роста»
- При 80%: красная кнопка «Подать в реестр Минцифры» → открывает инструкцию
- Миниграфик выручки по месяцам (sparkline из recharts)
- Ссылка «Подробный отчёт» → `/admin/billing/tax-report`

**Компонент `<TaxThresholdWidget>`:**

```tsx
// src/components/admin/billing/TaxThresholdWidget.tsx
'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Sparklines, SparklinesLine } from 'react-sparklines';

export function TaxThresholdWidget() {
  const [stats, setStats] = useState<TaxStats | null>(null);

  useEffect(() => {
    fetch('/api/admin/billing/tax-stats').then(r => r.json()).then(setStats);
  }, []);

  if (!stats) return <Card className="p-6 animate-pulse">Загрузка...</Card>;

  const { revenueRub, vatExemptionLimit, usedPercent, byMonth, year, regime, mincifryExempt } = stats;
  const percentColor = getPercentColor(usedPercent);
  const monthsToLimit = calcMonthsToLimit(byMonth, vatExemptionLimit);

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-ink-muted">Налоговая нагрузка {year}</div>
          <div className="text-3xl font-semibold mt-1">
            {(revenueRub / 100).toLocaleString('ru-RU')} ₽
          </div>
          <div className="text-sm text-ink-muted mt-1">
            из {(vatExemptionLimit / 100).toLocaleString('ru-RU')} ₽ лимита НДС
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${percentColor}`}>{usedPercent.toFixed(1)}%</div>
          <div className="text-xs text-ink-muted">{regime}{mincifryExempt ? ' + Минцифры' : ''}</div>
        </div>
      </div>

      <Progress value={usedPercent} className={`mt-4 ${percentColor}`} />

      {usedPercent < 80 && (
        <div className="text-sm text-ink-muted mt-3">
          Лимит достигнется через ≈ {monthsToLimit} при текущих темпах
        </div>
      )}

      {usedPercent >= 80 && !mincifryExempt && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
          <div className="font-semibold text-orange-900">Подайте в реестр Минцифры</div>
          <div className="text-sm text-orange-800 mt-1">
            Льгота освободит от НДС независимо от выручки. Срок 45 раб.дней.
          </div>
          <Button asChild className="mt-2" size="sm">
            <a href="/admin/billing/mincifry-guide">Как подать →</a>
          </Button>
        </div>
      )}

      {usedPercent >= 100 && !mincifryExempt && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <div className="font-semibold text-red-900">Лимит превышен!</div>
          <div className="text-sm text-red-800 mt-1">
            С 1-го числа следующего месяца — обязанность платить НДС. Обновите YOOKASSA_VAT_CODE.
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="text-xs text-ink-muted mb-1">По месяцам</div>
        <Sparklines data={Object.values(byMonth)} height={30}>
          <SparklinesLine color="var(--accent-bg)" />
        </Sparklines>
      </div>
    </Card>
  );
}
```

#### 3.13.4. API endpoint

```typescript
// src/app/api/admin/billing/tax-stats/route.ts
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { db } from '@/lib/db';

export async function GET() {
  await requireAdmin();

  const year = new Date().getUTCFullYear();
  const stats = await db.taxYearStats.findUnique({ where: { year } });

  if (!stats) {
    // Ещё не было первого платежа в этом году
    return NextResponse.json({
      year,
      revenueRub: 0,
      revenueByMonth: {},
      vatExemptionLimit: 20_000_000_00,
      usedPercent: 0,
      regime: 'USN_INCOME_6',
      mincifryExempt: false,
    });
  }

  return NextResponse.json(stats);
}
```

#### 3.13.5. Что делать когда приближается порог

Документ `admin/billing/mincifry-guide.mdx` содержит пошаговый гайд:

1. **Подготовить технические документы:** исходный код, описание архитектуры, руководство пользователя
2. **Проверить критерии** (резидент РФ, работает на российских ОС, не содержит запрещённых технологий)
3. **Подать заявление через Госуслуги** (ведомственная платформа Минцифры)
4. **Оплатить пошлину** ~15 000 ₽
5. **Опционально:** привлечь платного эксперта (ускоряет рассмотрение, ~30 000 ₽)
6. **Ждать решения** до 45 рабочих дней
7. **После включения в реестр:** установить `TAX_MINCIFRY_REGISTERED=true` в ENV
8. **В оферте и чеках указать**: «НДС не облагается (передача прав на ПО, подп. 26 п. 2 ст. 149 НК РФ)»

---

## 4. UI/UX личного кабинета биллинга

### 4.1. Карта страниц

```
/settings/billing                    — главная: текущая подписка + способ оплаты
/settings/billing/change-plan        — смена тарифа с preview proration
/settings/billing/payment-methods    — управление картами
/settings/billing/invoices           — история платежей + чеки
/settings/billing/cancel             — flow отмены с retention

/admin/billing                       — список всех подписок (админ)
/admin/billing/[subscriptionId]      — карточка конкретной подписки
/admin/billing/promo-codes           — создание и управление промокодами
/admin/billing/dunning               — список проблемных платежей
```

### 4.2. Страница `/settings/billing` — главная биллинга

**Что видит пользователь:**

Большая карточка с текущей подпиской:
- Название плана: «Сметчик-Студио Pro»
- Цена: «2 900 ₽/мес» или «27 840 ₽/год (−20%)»
- Следующий платёж: «15 мая 2026 — 2 900 ₽»
- Сохранённый способ: «Карта МИР •1234»

Справа — быстрые действия:
- «Сменить тариф» → `/settings/billing/change-plan`
- «Сменить способ оплаты» → `/settings/billing/payment-methods`
- «Перейти на годовую подписку» (если сейчас месячная) — с указанием экономии
- «Отменить подписку» (мелкой ссылкой внизу, не кнопкой)

Блок метрик использования:
- «Сметы в этом месяце: 47 (безлимит в Pro)»
- «Размер хранилища: 3.2 ГБ из 50 ГБ»
- «Публичные ссылки: 3 активные»

Нижний блок — последние 3 платежа со ссылкой на полную историю.

**Компонент `src/app/settings/billing/page.tsx`:**

```tsx
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { CurrentSubscriptionCard } from '@/components/billing/CurrentSubscriptionCard';
import { UsageMetricsCard } from '@/components/billing/UsageMetricsCard';
import { RecentPaymentsCard } from '@/components/billing/RecentPaymentsCard';
import { NoSubscriptionState } from '@/components/billing/NoSubscriptionState';

export const metadata = { title: 'Подписка и оплата' };

export default async function BillingPage() {
  const session = await getSessionOrThrow();
  const workspace = await db.workspace.findUniqueOrThrow({
    where: { id: session.user.activeWorkspaceId },
    include: {
      activeSubscription: {
        include: {
          plan: true,
          defaultPaymentMethod: true,
        },
      },
    },
  });

  if (!workspace.activeSubscription) {
    return <NoSubscriptionState workspace={workspace} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8">
      <h1 className="text-2xl font-semibold">Подписка и оплата</h1>

      <CurrentSubscriptionCard subscription={workspace.activeSubscription} />

      <Suspense fallback={<UsageMetricsSkeleton />}>
        <UsageMetricsCard workspaceId={workspace.id} />
      </Suspense>

      <Suspense fallback={<RecentPaymentsSkeleton />}>
        <RecentPaymentsCard workspaceId={workspace.id} limit={3} />
      </Suspense>
    </div>
  );
}
```

**Визуальные состояния `CurrentSubscriptionCard`:**

1. **TRIALING** — зелёный бэдж «Пробный период», отсчёт до конца: «Осталось 9 дней. Без карты автопродление не сработает — добавьте карту.»
2. **ACTIVE** — обычное отображение, кнопка «Сменить тариф»
3. **PAST_DUE** — КРАСНЫЙ баннер «Оплата не прошла. Попытка 2 из 5. Обновите карту.», кнопка «Обновить карту»
4. **GRACE** — ОРАНЖЕВЫЙ «Подписка закончилась. У вас 5 дней для восстановления. Режим только для чтения.», кнопка «Выбрать тариф»
5. **CANCELLED** — ЖЁЛТЫЙ «Подписка отменена. Активна до 15 мая 2026.», кнопка «Возобновить»
6. **EXPIRED** — СЕРЫЙ «Подписка истекла. Доступа к данным нет. Выберите тариф, чтобы восстановить.», кнопка «Выбрать тариф»

### 4.3. Страница `/settings/billing/change-plan` — смена тарифа

Ключевой экран. Здесь решается апгрейд/даунгрейд.

**Структура:**

Вверху — переключатель «Месяц | Год (−20%)».

Ниже — сетка из 3-5 карточек тарифов (для B2C — Сметчика это Free, Basic, Pro; для B2B — Старт, Команда, Корпоративный).

На карточке текущего тарифа — бэйдж «Ваш текущий» и кнопка отключена.

Для каждой карточки кнопка:
- Если план дороже текущего → «Обновить» (upgrade с proration)
- Если дешевле → «Сменить с [дата]» (schedule downgrade)
- Если годовая вариация текущего → «Перейти на годовую»

**При клике «Обновить» открывается модал preview proration:**

```
┌─────────────────────────────────────────────┐
│ Переход на Pro                              │
│                                             │
│ Текущий тариф:    Базовый (1 900 ₽/мес)    │
│ Новый тариф:       Pro (2 900 ₽/мес)       │
│                                             │
│ Осталось дней в текущем периоде: 18         │
│ Кредит за неиспользованное: −1 140 ₽        │
│ Доплата за Pro до конца периода: +1 740 ₽   │
│ ─────────────────────────────────           │
│ К оплате сейчас: 600 ₽                      │
│                                             │
│ Следующий платёж: 15 мая, 2 900 ₽           │
│                                             │
│ [Отмена]           [Обновить и заплатить]   │
└─────────────────────────────────────────────┘
```

**При клике «Сменить с [дата]» — попроще:**

```
┌─────────────────────────────────────────────┐
│ Смена на Базовый                            │
│                                             │
│ Текущий тариф: Pro (2 900 ₽/мес)           │
│ Новый тариф:  Базовый (1 900 ₽/мес)        │
│                                             │
│ ⚠ Внимание: на Базовом лимит 10 активных    │
│ смет, у вас сейчас 15. 5 смет будут         │
│ перемещены в архив при смене.               │
│                                             │
│ Текущий тариф продолжит работать до         │
│ 15 мая 2026. С этой даты тариф сменится.    │
│                                             │
│ [Отмена]          [Запланировать смену]     │
└─────────────────────────────────────────────┘
```

**API endpoint для preview:**

```typescript
// GET /api/subscriptions/[id]/preview-change?planId=xxx
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionOrThrow();
  const { planId } = Object.fromEntries(req.nextUrl.searchParams);

  const sub = await db.subscription.findUniqueOrThrow({
    where: { id: params.id },
    include: { plan: true, workspace: true },
  });

  await assertWorkspaceAccess(session.user.id, sub.workspaceId);

  const newPlan = await db.subscriptionPlan.findUniqueOrThrow({ where: { id: planId } });

  const isUpgrade = newPlan.priceRub > sub.plan.priceRub;

  if (isUpgrade) {
    const proration = calculateProration({
      currentPlanPriceRub: sub.plan.priceRub,
      newPlanPriceRub: newPlan.priceRub,
      periodStart: sub.currentPeriodStart,
      periodEnd: sub.currentPeriodEnd,
    });

    return Response.json({
      type: 'upgrade',
      currentPlan: sub.plan,
      newPlan,
      proration,
      chargeAt: new Date(),
      nextRenewalAt: sub.currentPeriodEnd,
      nextRenewalAmountRub: newPlan.priceRub,
    });
  } else {
    // Downgrade
    const currentUsage = await getCurrentUsage(sub.workspaceId);
    const warnings = calculateDowngradeWarnings(newPlan, currentUsage);

    return Response.json({
      type: 'downgrade',
      currentPlan: sub.plan,
      newPlan,
      effectiveAt: sub.currentPeriodEnd,
      warnings,
    });
  }
}
```

### 4.4. Страница `/settings/billing/payment-methods` — карты

Простая страница: список сохранённых способов, кнопка добавления.

```tsx
export default async function PaymentMethodsPage() {
  const session = await getSessionOrThrow();
  const methods = await db.paymentMethod.findMany({
    where: { workspaceId: session.user.activeWorkspaceId, isActive: true },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Способы оплаты</h1>
      <p className="text-ink-soft">Сохранённые карты и кошельки для автоматического продления подписки.</p>

      {methods.length === 0 ? (
        <EmptyState>
          <p>Нет сохранённых способов оплаты</p>
          <AddPaymentMethodButton />
        </EmptyState>
      ) : (
        <>
          <ul className="space-y-3">
            {methods.map((m) => (
              <PaymentMethodCard key={m.id} method={m} />
            ))}
          </ul>
          <AddPaymentMethodButton />
        </>
      )}
    </div>
  );
}
```

**Добавление новой карты:** отдельный платёж на 1 ₽ (или 10 ₽) с `save_payment_method: true`. После успешного списания деньги сразу возвращаются через refund. Стандартная практика, пользователи привыкли.

Либо использовать специальный flow ЮKassa для сохранения без списания — это делается через поддержку ЮKassa, включается отдельно.

### 4.5. Страница `/settings/billing/invoices` — история платежей

Таблица платежей с фильтрами: период, статус, тип.

Колонки:
- Дата
- Описание
- Сумма
- Статус (SUCCEEDED / FAILED / REFUNDED / PENDING)
- Чек (скачать PDF)
- Счёт (если B2B — скачать PDF)

На каждом платеже с чеком — кнопка скачивания PDF чека из ОФД.

Фильтры:
- По периоду (30 дней / 3 мес / год / всё время / диапазон)
- По статусу
- По типу (основной платёж / апгрейд / возврат)

```tsx
export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ /* ... */ }> }) {
  const sp = await searchParams;
  const session = await getSessionOrThrow();

  const payments = await db.payment.findMany({
    where: {
      workspaceId: session.user.activeWorkspaceId,
      ...buildFilterWhereClause(sp),
    },
    include: {
      subscription: { include: { plan: true } },
      receipt: true,
      invoice: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-semibold">История платежей</h1>
      <PaymentsFilterBar />
      <PaymentsTable payments={payments} />
      <Pagination total={/* ... */} />
    </div>
  );
}
```

### 4.6. Flow отмены — `/settings/billing/cancel`

Три шага для снижения churn:

**Шаг 1: Зачем вы уходите?**

Обязательный вопрос, анкета с вариантами:
- Слишком дорого
- Не хватает функций (уточнить каких — textarea)
- Ушёл к конкуренту (какому?)
- Не использую
- Технические проблемы
- Временно, вернусь
- Другое

**Шаг 2: Retention offer** (опционально, для определённых причин)

- Если выбрано «Слишком дорого»: **скидка 30% на 3 месяца** (если workspace платит хотя бы 2 месяца)
- Если «Не использую»: **пауза на 30 дней** (в будущем, пока не делаем)
- Если «Не хватает функций»: «Мы работаем над [текст]. Можно подождать 2 недели?»
- Если «Временно, вернусь»: ничего не предлагаем, даём отменить

Если пользователь принимает оффер — применяется скидка или пауза, подписка НЕ отменяется.

**Шаг 3: Подтверждение отмены**

«Вы уверены, что хотите отменить? После 15 мая 2026:
- Доступ к данным станет readonly
- Через 7 дней после окончания доступ прекратится
- Данные сохраняются 90 дней — возможно восстановление

[Оставить подписку]  [Отменить подписку]»

**Компонент `src/app/settings/billing/cancel/CancelFlow.tsx`:**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'reason' | 'retention' | 'confirm' | 'done';

export function CancelFlow({ subscription }: { subscription: SubscriptionWithPlan }) {
  const [step, setStep] = useState<Step>('reason');
  const [reason, setReason] = useState<CancellationReasonCode | null>(null);
  const [feedback, setFeedback] = useState('');
  const router = useRouter();

  async function handleConfirmCancel() {
    const res = await fetch(`/api/subscriptions/${subscription.id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason, feedback }),
    });
    if (res.ok) {
      setStep('done');
      setTimeout(() => router.push('/settings/billing'), 2000);
    }
  }

  async function handleAcceptOffer(offer: string) {
    await fetch(`/api/subscriptions/${subscription.id}/apply-retention`, {
      method: 'POST',
      body: JSON.stringify({ offer, originalReason: reason }),
    });
    router.push('/settings/billing?retention=applied');
  }

  if (step === 'reason') {
    return <ReasonForm onSubmit={(r, f) => { setReason(r); setFeedback(f); setStep(shouldShowRetention(r) ? 'retention' : 'confirm'); }} />;
  }
  if (step === 'retention') {
    return <RetentionOffer reason={reason!} onAccept={handleAcceptOffer} onDecline={() => setStep('confirm')} />;
  }
  if (step === 'confirm') {
    return <ConfirmCancellation subscription={subscription} onConfirm={handleConfirmCancel} onCancel={() => router.back()} />;
  }
  return <DoneMessage />;
}

function shouldShowRetention(reason: CancellationReasonCode | null): boolean {
  return reason === 'TOO_EXPENSIVE' || reason === 'MISSING_FEATURES' || reason === 'NOT_USING';
}
```

### 4.7. Dunning UX — что видит пользователь с проблемой оплаты

**Баннер в шапке приложения:** (глобальный, рендерится если `subscription.status === 'PAST_DUE'`)

```
┌─────────────────────────────────────────────────────────┐
│ ⚠ Автосписание не прошло. Попытка 2 из 5.              │
│ Карта •1234 отклонена банком. Обновите способ оплаты,   │
│ чтобы не потерять доступ.                 [Обновить →]  │
└─────────────────────────────────────────────────────────┘
```

На 5-й попытке (последняя):

```
┌─────────────────────────────────────────────────────────┐
│ 🔴 Последняя попытка списания не удалась.              │
│ Через 7 дней доступ будет ограничен. Обновите карту.   │
│                                           [Обновить →]  │
└─────────────────────────────────────────────────────────┘
```

**Email-напоминания:**
1. После 1-го отказа: «Мы не смогли списать оплату. Попробуем ещё раз через день.»
2. После 3-го: «Проблема не решилась. Обновите карту до [дата].»
3. После 5-го: «Доступ ограничен 7 дней. Восстановите оплату, чтобы продолжить.»

### 4.8. Email-уведомления

Полный список триггеров:

| Событие | Email-шаблон | Когда |
|---------|--------------|-------|
| Подписка создана | `subscription-welcome.hbs` | Сразу после первого платежа |
| Триал начат | `trial-started.hbs` | При регистрации solo + выборе триала |
| Триал заканчивается (3 дня) | `trial-ending-soon.hbs` | За 3 дня до конца триала |
| Триал закончился | `trial-expired.hbs` | В день окончания, если не перешёл в платный |
| Автопродление успешно | `renewal-succeeded.hbs` | После webhook SUCCEEDED |
| Платёж не прошёл (первый раз) | `payment-failed-1.hbs` | После первой dunning попытки |
| Платёж не прошёл (3-й раз) | `payment-failed-3.hbs` | После третьей попытки |
| Последняя попытка не прошла | `payment-failed-final.hbs` | После 5-й попытки |
| Переход в GRACE | `grace-started.hbs` | При переходе ACTIVE/PAST_DUE → GRACE |
| Подписка истекла | `subscription-expired.hbs` | При переходе GRACE → EXPIRED |
| Подписка отменена | `subscription-cancelled.hbs` | При cancel |
| Retention offer | `retention-discount.hbs` | Через 3 дня после отмены с reason TOO_EXPENSIVE |
| Тариф повышен | `plan-upgraded.hbs` | После upgrade |
| Смена тарифа запланирована | `plan-change-scheduled.hbs` | После scheduleDowngrade |
| Чек 54-ФЗ | не email, отправляет ЮKassa | Автоматически после платежа |

Все шаблоны — Handlebars в `templates/emails/billing/`, отправка через BullMQ worker `email.worker.ts`.

### 4.9. Админская страница `/admin/billing`

Только для `user.role === 'ADMIN'`.

Возможности:
- Список всех подписок с фильтрами: статус, план, период
- Поиск по email / organizationId / workspaceId
- Карточка подписки:
  - История событий (SubscriptionEvent)
  - История платежей
  - Ручное продление (`manualExtend(days)`)
  - Ручная отмена
  - Ручной возврат денег
  - Применить скидку вручную (создать промокод на 100%)
- Статистика:
  - MRR, ARR, ARPA
  - Churn rate
  - Trial conversion
  - График новых подписок по дням
- Dunning-dashboard:
  - Список PAST_DUE
  - Ручная попытка списания
  - Ручное перевод в GRACE / EXPIRED

---

## 5. API endpoints — полный список

### 5.1. Публичные (для пользователя)

```
GET    /api/subscriptions/active                    # активная подписка workspace
GET    /api/subscription-plans                       # каталог доступных тарифов
POST   /api/subscriptions/start                      # создать подписку (первая оплата)
POST   /api/subscriptions/[id]/upgrade               # апгрейд (с проверкой proration)
POST   /api/subscriptions/[id]/downgrade             # запланировать даунгрейд
POST   /api/subscriptions/[id]/cancel                # отменить подписку
POST   /api/subscriptions/[id]/reactivate            # возобновить отменённую
POST   /api/subscriptions/[id]/apply-retention       # применить retention-оффер
GET    /api/subscriptions/[id]/preview-change?planId # preview proration
GET    /api/subscriptions/[id]/usage                 # текущие использованные лимиты

GET    /api/payments                                 # история платежей (с фильтрами)
GET    /api/payments/[id]                            # детали платежа
GET    /api/payments/[id]/receipt                    # скачать чек (redirect на ofdUrl)
POST   /api/payments/[id]/refund                     # запрос возврата (требует approve)

GET    /api/payment-methods                          # список сохранённых
POST   /api/payment-methods/add                      # создать платёж-заглушку для сохранения
DELETE /api/payment-methods/[id]                     # деактивировать
PATCH  /api/payment-methods/[id]/default             # сделать способом по умолчанию

GET    /api/invoices                                 # для B2B
POST   /api/invoices/[id]/pay                        # онлайн-оплата счёта

POST   /api/promo-codes/validate                     # валидация кода без применения

POST   /api/webhooks/yookassa                        # webhook (не аутентифицирован, IP-check)
```

### 5.2. Админские

```
GET    /api/admin/billing/subscriptions              # список всех с фильтрами
GET    /api/admin/billing/subscriptions/[id]         # детали
POST   /api/admin/billing/subscriptions/[id]/extend  # продлить вручную
POST   /api/admin/billing/subscriptions/[id]/cancel  # отменить вручную
POST   /api/admin/billing/subscriptions/[id]/refund  # возврат

GET    /api/admin/billing/metrics                    # MRR, ARR, churn
GET    /api/admin/billing/dunning                    # список PAST_DUE
POST   /api/admin/billing/dunning/[id]/retry         # ручной retry

GET    /api/admin/billing/promo-codes                # список
POST   /api/admin/billing/promo-codes                # создать
PATCH  /api/admin/billing/promo-codes/[id]           # изменить (например, отключить)
```

### 5.3. Пример реализации `POST /api/subscriptions/start`

```typescript
// src/app/api/subscriptions/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { startSubscription } from '@/lib/payments/subscription-service';
import { errorResponse, successResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

const schema = z.object({
  planId: z.string().uuid(),
  billingPeriod: z.enum(['MONTHLY', 'YEARLY']),
  promoCode: z.string().optional(),
  returnUrl: z.string().url(),
  confirmation: z.enum(['redirect', 'embedded']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const result = await startSubscription({
      workspaceId: session.user.activeWorkspaceId,
      userId: session.user.id,
      ...parsed.data,
    });

    return successResponse({
      paymentId: result.payment.id,
      confirmationUrl: result.confirmationUrl,
      status: result.payment.status,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания подписки');
    if (error instanceof Error && error.message.startsWith('PROMO_')) {
      return errorResponse(error.message, 400);
    }
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
```

### 5.4. Middleware защиты доступа к workspace

Уже есть из Фазы 1 Модуля 15, но важно напомнить: все роуты биллинга должны проверять, что пользователь имеет доступ к указанному workspace.

```typescript
export async function assertWorkspaceAccess(userId: string, workspaceId: string, requiredRole?: WorkspaceRole) {
  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) {
    throw new ForbiddenError('Нет доступа к рабочему пространству');
  }
  if (requiredRole && !hasRole(member.role, requiredRole)) {
    throw new ForbiddenError('Недостаточно прав');
  }
  return member;
}
```

**Биллинг-операции доступны только OWNER и ADMIN**, обычные MEMBER и GUEST видят `/settings/billing` но не могут изменять.

---

## 6. Роадмап реализации — 2-3 недели

Работа поверх завершённой базы (Фазы 1-7 Модуля 15).

### Неделя 1 — Модели, ЮKassa, чеки

**День 1-2 — Prisma-миграция новых моделей**

```
📋 ЗАДАЧА: Добавить новые модели подписок в Prisma-схему

Прочитай CLAUDE.md и prisma/schema.prisma.

1. Расширить существующие модели:
   - SubscriptionPlan: добавить поля maxEstimatesPerMonth, maxAosrPerMonth,
     maxActiveObjects, maxJournalEntriesPerMonth, maxPublicLinksActive,
     trialDays, trialFeatures, isPopular, isVisible, isLegacy, metadata
   - Subscription: добавить поля pendingPlanId, pendingPlanChangeAt,
     defaultPaymentMethodId, graceUntil, dunningAttempts, nextDunningAt,
     cancelReason, cancelFeedback, effectiveEndDate
   - Payment: добавить поля type, billingPeriod, providerIdempotenceKey,
     providerMetadata, requiresCapture, capturedAt, confirmationUrl,
     paymentMethodId, savePaymentMethod, paymentMethodSnapshot,
     promoCodeId, discountRub, originalAmountRub, refundedAt,
     refundedAmountRub, refundReason, invoiceId, receiptId, source,
     ipAddress, userAgent

2. Создать новые модели (см. раздел 1 SUBSCRIPTION_SYSTEM.md):
   - PaymentMethod
   - SubscriptionEvent
   - Receipt
   - Invoice
   - PromoCode + PromoCodeRule + PromoCodeRedemption
   - DunningAttempt

3. Создать миграцию:
   npx prisma migrate dev --name extend_subscription_system

4. Сгенерировать клиент:
   npx prisma generate

5. Обновить seed с новыми полями тарифов (trialDays=14 для Pro-тарифов,
   isPopular для Pro).

ПРОВЕРКА:
- npx tsc --noEmit без ошибок
- npx prisma studio → все новые модели видны
```

**День 3-4 — Расширенный ЮKassa клиент**

```
📋 ЗАДАЧА: Переписать ЮKassa клиент по SUBSCRIPTION_SYSTEM.md разделу 2

1. Создать папку src/lib/payments/yookassa/ и файлы:
   - client.ts (базовый HTTP-клиент с retry, idempotency)
   - payments.ts (createPayment, chargeRecurring, getPayment, cancelPayment)
   - refunds.ts (createRefund)
   - receipts.ts (buildSubscriptionReceipt с VatCode и PaymentMode)
   - webhooks.ts (isYookassaIp, handleNotification)
   - payment-methods.ts (получение, деактивация)
   - types.ts (все типы ответов ЮKassa)
   - errors.ts (YookassaError, YookassaValidationError, YookassaNetworkError)

2. Старый клиент src/lib/payments/yookassa-client.ts переместить
   в yookassa/legacy-client.ts и оставить до миграции всех вызовов.

3. Добавить пакет ip-cidr для проверки IP whitelist:
   npm install ip-cidr

4. Обновить webhook /api/webhooks/yookassa/route.ts:
   - Проверка IP через isYookassaIp
   - Обработка всех событий: payment.succeeded, payment.canceled,
     payment.waiting_for_capture, refund.succeeded
   - Идемпотентность через providerPaymentId

ПРОВЕРКА:
- Создать тестовый платёж из /settings/billing/change-plan
- Оплатить через тестовую карту ЮKassa
- Webhook приходит, платёж переходит в SUCCEEDED
- Подписка активируется
```

**День 5 — Subscription Service и чеки 54-ФЗ**

```
📋 ЗАДАЧА: Написать subscription-service.ts и включить чеки

1. Создать src/lib/payments/subscription-service.ts с функциями:
   - startSubscription (с применением промо и кредитов)
   - upgradeSubscription (с proration)
   - scheduleDowngrade
   - cancelSubscription, reactivateSubscription
   - handleSuccessfulPayment, handleCancelledPayment (для webhook)
   - handleSuccessfulRefund

2. Создать src/lib/payments/proration.ts с calculateProration.

3. Создать src/lib/payments/promo-service.ts с validateAndApplyPromoCode.

4. В ЛК ЮKassa включить "Чеки от ЮKassa".
   В .env добавить YOOKASSA_RECEIPTS_ENABLED=true и YOOKASSA_VAT_CODE=1
   (если есть ИТ-льгота) или 7 (если нет льготы, 22% с 2026).

5. Обновить createPayment чтобы всегда строил объект receipt для подписок.

ПРОВЕРКА:
- Создать платёж → чек отправляется на email плательщика
- В ЛК ЮKassa → "Чеки" — видна запись
```

### Неделя 2 — Proration, Dunning, Cancel, Cron-джобы

**День 6-7 — Upgrade/Downgrade UI + API**

```
📋 ЗАДАЧА: Сделать полный flow смены тарифа

1. API endpoints:
   - GET /api/subscriptions/[id]/preview-change?planId=xxx
   - POST /api/subscriptions/[id]/upgrade
   - POST /api/subscriptions/[id]/downgrade

2. UI:
   - /settings/billing/change-plan — страница с карточками тарифов
   - Модал preview proration (ChangePlanPreviewModal)
   - Модал warning для downgrade с перечислением превышенных лимитов

3. Обработка:
   - При upgrade без сохранённой карты → редирект на checkout
   - При upgrade с сохранённой картой → мгновенное списание
   - При downgrade → запись в pendingPlanId

ПРОВЕРКА:
- Пользователь на Basic → апгрейд на Pro → списывается proration
- Пользователь на Pro → даунгрейд → pendingPlanId установлен
- Cron применяет downgrade при продлении
```

**День 8-9 — Dunning + Grace period**

```
📋 ЗАДАЧА: Реализовать dunning-service и cron-джобы

1. Создать src/lib/payments/dunning-service.ts:
   - startDunning
   - attemptDunningCharge
   - scheduleNextDunningAttempt
   - transitionToGrace, transitionToExpired

2. Создать BullMQ workers в src/lib/queues/workers/:
   - subscription-lifecycle.worker.ts (каждый час)
     - processExpiringSubscriptions
     - processDunningAttempts
     - processGraceExpirations
     - applyPendingPlanChanges
   - email-reminder.worker.ts
     - триал напоминания
     - dunning напоминания
     - retention offers

3. BullMQ schedule:
   - Каждый час: subscription-lifecycle
   - Каждый день 09:00 МСК: email напоминания
   - Раз в неделю: метрики для админ-дашборда

ПРОВЕРКА:
- Имитировать отказ карты (тестовая карта ЮKassa c ошибкой)
- Статус подписки → PAST_DUE
- Через cron запускается вторая попытка
- После 5 попыток → GRACE
- Через 7 дней после GRACE → EXPIRED
```

**День 10 — Cancel flow + Retention**

```
📋 ЗАДАЧА: Сделать полный flow отмены с retention

1. API:
   - POST /api/subscriptions/[id]/cancel
   - POST /api/subscriptions/[id]/reactivate
   - POST /api/subscriptions/[id]/apply-retention

2. UI:
   - /settings/billing/cancel — три шага: reason → retention → confirm
   - Компоненты: ReasonForm, RetentionOffer, ConfirmCancellation

3. Retention-предложения:
   - TOO_EXPENSIVE → промокод SKIDKA30-3M (30% на 3 мес)
   - NOT_USING → пауза на 30 дней (стаб — пока кнопка "написать мне потом")
   - MISSING_FEATURES → сбор текста в feedback + упоминание roadmap

ПРОВЕРКА:
- Отмена → email подтверждения
- Через 3 дня автопрограмма: если reason=TOO_EXPENSIVE → email со скидкой
```

### Неделя 3 — UI биллинга, админка, тесты

**День 11-12 — Billing UX**

```
📋 ЗАДАЧА: Главные страницы биллинга

1. /settings/billing — главная (CurrentSubscriptionCard, UsageMetricsCard, RecentPaymentsCard)
2. /settings/billing/payment-methods — список карт + добавление
3. /settings/billing/invoices — история платежей с фильтрами

4. Компоненты:
   - Компоненты для каждого статуса подписки (TRIALING, ACTIVE, PAST_DUE, GRACE, CANCELLED, EXPIRED)
   - PaymentMethodCard (с кнопкой удалить/сделать по умолчанию)
   - PaymentsTable с фильтрами и пагинацией

5. Глобальный баннер для статуса PAST_DUE и GRACE — рендерится в layout
   приложения если есть такая подписка.

ПРОВЕРКА:
- Все 6 состояний подписки отображаются корректно
- Lighthouse > 90 для страниц биллинга
- Mobile layout работает
```

**День 13 — Админка**

```
📋 ЗАДАЧА: /admin/billing

1. /admin/billing — список всех подписок с фильтрами
2. /admin/billing/[id] — карточка подписки с действиями
3. /admin/billing/promo-codes — CRUD промокодов
4. /admin/billing/dunning — список проблемных платежей

5. API endpoints /api/admin/billing/* с проверкой role=ADMIN

ПРОВЕРКА:
- Админ может продлить подписку вручную
- Админ может вернуть деньги
- Видна полная статистика (MRR, churn)
```

**День 14 — Email-уведомления**

```
📋 ЗАДАЧА: Все 15 email-шаблонов

1. Создать templates/emails/billing/*.hbs для всех событий из таблицы в разделе 4.8

2. Обновить email.worker.ts чтобы обрабатывать новые типы задач:
   - BILLING_WELCOME, TRIAL_ENDING_SOON, TRIAL_EXPIRED,
     RENEWAL_SUCCEEDED, PAYMENT_FAILED_1/3/FINAL,
     GRACE_STARTED, SUBSCRIPTION_EXPIRED, SUBSCRIPTION_CANCELLED,
     RETENTION_DISCOUNT, PLAN_UPGRADED, PLAN_CHANGE_SCHEDULED

3. Обновить все subscription-service функции чтобы enqueue-ить email

ПРОВЕРКА:
- Каждое событие → email приходит
- Шаблоны рендерятся корректно с данными
```

**День 15 — Тесты**

```
📋 ЗАДАЧА: Unit и integration тесты

1. Unit-тесты:
   - lib/payments/proration.test.ts (все граничные случаи)
   - lib/payments/promo-service.test.ts (все типы скидок)
   - lib/payments/yookassa/client.test.ts (моки fetch)
   - lib/payments/subscription-service.test.ts

2. Integration-тесты (с реальной тестовой БД):
   - Полный flow: signup → trial → payment → renewal → upgrade → cancel
   - Dunning: отказ → попытки → grace → expired
   - Downgrade с warnings

ПРОВЕРКА:
- npx tsc --noEmit зелёный
- npx jest проходит все тесты
- Coverage > 70% для lib/payments/
```

---

## 7. Чек-лист запуска в production

### 7.0. Регистрация ИП и открытие расчётного счёта

Перед всеми шагами — нужно зарегистрировать ИП, если ещё нет. Это 1-2 недели.

- [ ] **Регистрация ИП через Госуслуги** (бесплатно, без похода в ФНС):
  - Войти на Госуслуги → «Регистрация ИП»
  - Заполнить заявление Р21001 (форма автоматическая)
  - Выбрать ОКВЭД: основной **62.01** (Разработка компьютерного программного обеспечения)
  - Дополнительные ОКВЭД: 62.02, 62.09, 63.11, 63.12, 73.11
  - Подписать УКЭП через Госключ (или загрузить если есть)
  - Срок: 3 рабочих дня
- [ ] **Выбор УСН «Доходы» 6%** в момент регистрации (или в течение 30 дней после):
  - Заявление по форме 26.2-1 (также через Госуслуги)
  - Альтернатива: подать в 2026 году до 31 декабря для применения с 2027
- [ ] **Получение ОГРНИП и ИНН**:
  - ОГРНИП приходит в Личный кабинет Госуслуг
  - ИНН физлица уже есть у тебя — это он же
- [ ] **Открытие расчётного счёта**:
  - Рекомендуется банк для IT: **Тинькофф Бизнес** (бесплатный тариф «Простой»), **Точка** (специализация на IT), **Альфа** (хорошее API)
  - Онлайн-открытие за 1 день без посещения офиса
  - Важно: бесплатные тарифы обычно ограничивают обороты (напр. 150 тыс ₽/мес) — при росте менять на платный
- [ ] **Регистрация в ФНС как страхователя** (автоматически при регистрации ИП)
- [ ] **Настройка онлайн-бухгалтерии**:
  - «Моё Дело» (~5 000 ₽/год базовый)
  - «Эльба» от Контура (~10 000 ₽/год)
  - «Тинькофф Бухгалтерия» (бесплатно при тарифе Бизнес)
  - Авто-сверка с ФНС, подсчёт страховых взносов, заполнение декларации

### 7.1. ЮKassa настройка

- [ ] **Регистрация магазина в ЮKassa от имени ИП**:
  - В ЛК ЮKassa указать тип: **Индивидуальный предприниматель**
  - ИНН ИП, ОГРНИП, паспортные данные
  - Расчётный счёт ИП (из Тинькофф/Точка/Альфа)
- [ ] **Подписание договора** с ЮKassa (электронно через ЛК, УКЭП)
- [ ] **Включение способов оплаты**:
  - [x] Банковские карты (МИР, VISA, Mastercard)
  - [x] СБП (быстрые платежи)
  - [x] СберПей
  - [x] ЮMoney (кошелёк)
  - [x] T-Pay (Т-Банк Pay)
  - [ ] Для рекуррентов: **только «Банковские карты» и «ЮMoney»** (СБП и SberPay для подписок не работают)
- [ ] **Запрос автоплатежей в поддержку ЮKassa** (важно!):
  - Написать в чат поддержки: «Хочу подключить рекуррентные платежи для SaaS-подписок»
  - Приложить скриншот страницы `/settings/billing/payment-methods` где видно как пользователь может отвязать карту
  - Указать ожидаемый месячный оборот по рекуррентам
  - Срок одобрения: **1-3 рабочих дня** (при везении — за день)
- [ ] **Получение production-ключей**:
  - `YOOKASSA_SHOP_ID` — в ЛК ЮKassa
  - `YOOKASSA_SECRET_KEY` — в ЛК ЮKassa → Интеграция → Ключи API (секретный ключ)
- [ ] **URL webhook** в ЛК ЮKassa: `https://app.komplid.ru/api/webhooks/yookassa`
- [ ] **События webhook** включены: `payment.succeeded`, `payment.canceled`, `payment.waiting_for_capture`, `refund.succeeded`, `payment_method.active`
- [ ] **Комиссии проверены** в ЛК: стандартные 3.5%, при малых объёмах может быть выше

### 7.2. ФЗ-54 (онлайн-касса)

- [ ] **Подключены «Чеки от ЮKassa»** (галочка в ЛК ЮKassa)
- [ ] **Налоговый режим в настройках чеков**: **УСН Доходы** (ОСН не выбираем)
- [ ] **Ставка НДС в настройках чеков**: **Без НДС** (код `vat_code: 1`)
- [ ] **ENV-переменные установлены**:
  - `YOOKASSA_VAT_CODE=1`
  - `TAX_REGIME=USN_INCOME_6`
  - `TAX_VAT_EXEMPT=true`
- [ ] **Тестовая отправка чека** — он приходит на email плательщика и регистрируется в ОФД
- [ ] **В чеке правильные реквизиты ИП**: название, ИНН, ОГРНИП
- [ ] **Проверен признак «Предмет расчёта»**: `service` (услуга) для SaaS-подписок

### 7.3. Реестр Минцифры (критично для продаж и устранения НДС)

- [ ] **Запуск процедуры включения Komplid в Единый реестр российского ПО**:
  - Подача заявки через Госуслуги → «Реестр отечественного ПО»
  - Пошлина ~15 000 ₽
  - Срок рассмотрения до 45 рабочих дней
- [ ] **Подготовка пакета документов**:
  - Исходный код (архив или ссылка на приватный git)
  - Свидетельство о регистрации программы для ЭВМ в Роспатенте (~3 000 ₽, ~2 месяца — **делать параллельно**)
  - Техническая документация: руководство пользователя, архитектура
  - Справка о резидентстве РФ
  - Подтверждение работы на российских ОС (Astra Linux, ALT Linux) — протестировать сборку
- [ ] **Проверка критериев**:
  - [x] Резидент РФ
  - [x] Нет запрещённых технологий в зависимостях
  - [x] ПО работает автономно (не требует облачных сервисов из недружественных стран)
  - [x] Исключительные права принадлежат ИП/ООО резиденту
- [ ] **После включения в реестр**:
  - Установить `TAX_MINCIFRY_REGISTERED=true` в ENV
  - Обновить оферту: добавить ссылку на номер в реестре
  - В чеках оставить `vat_code: 1` (льгота по подп. 26 п. 2 ст. 149 НК РФ)
  - Привлечение B2B-клиентов которым важен реестр (часто — госзаказчики)

### 7.4. Юридическое оформление

- [ ] **Публичная оферта** опубликована на `komplid.ru/legal/oferta`:
  - Пункт про применение УСН и освобождение от НДС
  - Реквизиты ИП (полное имя, ИНН, ОГРНИП, р/с, БИК банка)
  - Порядок заключения договора (акцепт оферты = оплата)
  - Порядок возвратов
  - Лицензионные условия использования ПО (если Минцифры — с отсылкой к подп. 26 п. 2 ст. 149 НК РФ)
- [ ] **Политика конфиденциальности** с учётом ФЗ-152 на `komplid.ru/legal/privacy`
- [ ] **Пользовательское соглашение** на `komplid.ru/legal/terms`
- [ ] **Политика возвратов** описана (отдельно или в оферте)
- [ ] **В checkout**: галочка «Согласен с офертой и политикой конфиденциальности» обязательна
- [ ] **Реквизиты ИП в футере** сайта и приложения (ИП ФИО, ИНН, ОГРНИП)
- [ ] **Договор на обработку ПД** заключён с Timeweb Cloud (уже должно быть)
- [ ] **Регистрация в Роскомнадзоре** как оператора персональных данных:
  - Уведомление об обработке ПД через Госуслуги → РКН
  - Бесплатно, 30 дней
  - Обязательно для SaaS с регистрацией пользователей

### 7.5. Тестирование перед запуском

- [ ] Тестовый магазин ЮKassa (test_*) подключён на staging
- [ ] Тестовые карты ЮKassa использованы для сценариев:
  - [ ] Успешный первый платёж
  - [ ] Успешное продление
  - [ ] Отказ карты → dunning → восстановление
  - [ ] Отказ карты 5 раз → grace → expired
  - [ ] Upgrade с proration
  - [ ] Downgrade с предупреждением
  - [ ] Cancel + retention offer + reactivate
  - [ ] Возврат полной суммы
  - [ ] Частичный возврат
- [ ] Webhook идемпотентность: один и тот же payment.succeeded дважды → подписка не дублируется

### 7.6. Мониторинг и алерты

- [ ] Логирование всех платежей через pino
- [ ] Алерт в Telegram-канал `#billing-alerts`:
  - Любой FAILED платёж на сумму > 10 000 ₽
  - Dunning на 5-й попытке
  - Webhook с неизвестным event
  - Subscription.status несовместим с данными (inconsistency checks)
- [ ] Sentry для ошибок в webhook обработке (критично)
- [ ] Еженедельная сводка: MRR, новые подписки, cancels, dunning count

### 7.7. Бухгалтерия

- [ ] Подключён онлайн-сервис бухгалтерии (Моё Дело / Эльба / Тинькофф Бухгалтерия)
- [ ] Настроен экспорт платежей из ЮKassa в бухгалтерию (автоматическая синхронизация через интеграцию или ручная выгрузка CSV раз в месяц)
- [ ] Определён порядок возвратов: кто одобряет, в какие сроки, как отражается в учёте
- [ ] **Квартальные выплаты УСН 6%**:
  - До 28 апреля — авансовый платёж за 1 квартал
  - До 28 июля — авансовый платёж за 1 полугодие
  - До 28 октября — авансовый платёж за 9 месяцев
  - До 28 апреля следующего года — итоговый платёж + декларация

### 7.8. Поддержка пользователей

- [ ] Написана инструкция для поддержки по типовым вопросам биллинга
- [ ] FAQ на `komplid.ru/faq#billing` с ответами:
  - Как отменить подписку
  - Как сменить карту
  - Можно ли вернуть деньги
  - Что делать если автопродление не прошло
  - Как получить закрывающие документы для юрлица
  - Почему в чеке «Без НДС» (ответ: применяем УСН)
- [ ] Canned responses в поддержке для частых ситуаций

### 7.9. Налоги ИП на УСН (годовой ритм)

- [ ] **Страховые взносы ИП за себя** (обязательные, платятся в ФНС):
  - Фиксированная часть (2026): ~53 658 ₽/год (обновляется каждый год)
  - Дополнительный взнос 1% с доходов свыше 300 000 ₽/год
  - Срок: до 31 декабря за фикс, до 1 июля следующего года за 1%
  - **Важно**: уменьшают налог УСН на всю сумму (если без работников)
- [ ] **Автоматизация расчёта через Моё Дело/Эльбу**:
  - Сервис сам считает налог и напоминает о дедлайнах
  - Подаёт декларацию электронно
- [ ] **ЕНС (Единый налоговый счёт)**:
  - С 2023 все налоги идут на ЕНС
  - Убедиться что ЕНС привязан к ИП в ЛК ФНС
- [ ] **Декларация УСН**:
  - Сдаётся раз в год до 25 апреля следующего года
  - Можно через Моё Дело / Эльбу / ЛК ФНС
- [ ] **Книга учёта доходов и расходов (КУДиР)**:
  - Ведётся в электронном виде в бухсервисе
  - Распечатывать не обязательно, но при запросе ФНС — обязаны предоставить
- [ ] **Мониторинг приближения к порогу 20 млн ₽**:
  - Админ-виджет в `/admin/billing` (раздел 3.13)
  - Алерт на email при 80% (16 млн ₽)
  - Алерт при превышении — срочное решение о смене режима
- [ ] **Страхование ответственности** (опционально, но рекомендуется для B2B):
  - Полис E&O (Errors & Omissions) для защиты от претензий клиентов
  - ~15-30 тыс ₽/год на старте

---

## 8. Отличия от Модуля 15 (что меняется)

### 8.1. Что меняется в Модуле 15 плане

**Фаза 8 УДАЛЯЕТСЯ:**
- Раздел «Tilda + маркетинг» не реализуется
- Вместо этого — отдельный проект komplid-marketing (см. MODULE_MARKETING_PLAN.md)
- Webhook от Tilda НЕ нужен
- Единственный источник оплаты — ЮKassa через приложение

**Фаза 2 расширяется:**
- Базовые модели SubscriptionPlan, Subscription, Payment дополняются полями из SUBSCRIPTION_SYSTEM.md раздел 1
- Добавляются новые модели: PaymentMethod, SubscriptionEvent, Receipt, Invoice, PromoCode, DunningAttempt

**Фаза 3 расширяется:**
- Вместо минимального ЮKassa клиента — полноценный с retry, errors, idempotency
- Добавляется работа с чеками 54-ФЗ
- Добавляется обработка всех статусов платежа (не только succeeded/canceled)

**Добавляется новая Фаза 9 (эквивалент этого документа):**
- Proration и apgrade/downgrade
- Dunning и grace period
- Cancel flow с retention
- Полный UX биллинга
- Админская страница
- Email-уведомления

### 8.2. Резюме объёма работ

Документ закрывает **все критические пробелы** базовой реализации из Фазы 2-3 Модуля 15:

- Было: 2 статуса платежа (SUCCEEDED / FAILED)
- Стало: 8 статусов + полный автомат переходов

- Было: нет автопродления
- Стало: автоплатежи + dunning + grace + email-уведомления

- Было: нет чеков 54-ФЗ (риск штрафов ФНС)
- Стало: полная интеграция через «Чеки от ЮKassa»

- Было: нет upgrade/downgrade
- Стало: proration, scheduled downgrade, preview UI

- Было: нет промокодов
- Стало: 4 типа скидок + рефералы + кредиты

- Было: нет UX биллинга
- Стало: 7 страниц с всеми сценариями

**Общая оценка:** 2-3 недели работы Claude Code поверх готовой Фазы 2-3 Модуля 15. После завершения — система подписок готова к production-запуску.

---

## 9. Что остаётся за рамками документа (на будущее)

- **Многоуровневая тарификация для Enterprise** — по % от ACV (Annual Construction Volume)
- **SSO и SCIM** — для крупных клиентов
- **Оплата по счёт-фактуре через безнал** — базовая модель Invoice есть, UI и процесс оформления не детализированы
- **A/B тестирование тарифов и промо** — инфраструктура для экспериментов
- **LTV/CAC аналитика** — вложенные дашборды
- **Churn prediction** — ML для предсказания оттока
- **Reactivation campaigns** — email-серии для EXPIRED пользователей
- **Партнёрские выплаты** — массовые payout через ЮKassa API (после 100+ рефералов)
- **Multi-currency** — при выходе на международные рынки (пока только RUB)

Все эти темы — отдельные модули/документы после успешного запуска текущей версии.
