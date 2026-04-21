# StroyDocs — Дорожная карта разработки

**v2 · Архитектура по модулям ЦУС**

Структура переработана под модульную архитектуру ЦУС («Цифровое управление строительством»).
Каждый модуль = самостоятельный раздел системы с собственными вкладками, API и схемой БД.

**Статусы:** ⬜ не начато · 🔄 в работе · ✅ готово · ⏸ отложено

---

### Добавлено (2026-04-21) — SUBSCRIPTION_SYSTEM.md Пункт 1: Prisma-схема финальная ✅

- ✅ `prisma/schema.prisma` — 8 новых моделей: `PaymentMethod`, `SubscriptionEvent`, `Receipt`, `Invoice`, `PromoCode`, `PromoCodeRule`, `PromoCodeRedemption`, `DunningAttempt`; 15 новых enum (`PlanCategory`, `ProfiRole`, `CancellationReasonCode`, `PaymentType`, `PaymentProvider`, `PaymentMethodType`, `SubscriptionEventType`, `ActorType`, `ReceiptType`, `ReceiptProvider`, `ReceiptStatus`, `InvoiceStatus`, `DiscountType`, `DunningResult`, `UserDunningAction`); расширены `SubscriptionStatus`, `PaymentStatus`, `PaymentSource`; добавлены поля в `SubscriptionPlan`, `Subscription`, `Payment`
- ✅ `prisma/migrations/20260421070000_extend_subscription_system/migration.sql` — идемпотентная миграция (ADD COLUMN IF NOT EXISTS, DO $$ BEGIN...END $$)
- ✅ `prisma/seeds/subscription-plans.ts` — обновлён: `trialDays=14` для Pro-тарифов, `isPopular=true`, features как Json

---

### Добавлено (2026-04-21) — MODULE15 Фаза 7: Прораб-Журнал + PWA ✅

- ✅ `src/components/mobile/VoiceRecorder.tsx` — MediaRecorder + Yandex SpeechKit (Pro only)
- ✅ Feature-gate в мобильных страницах (MOBILE_PWA, VOICE_INPUT, DEFECTS_LITE)
- ✅ `src/app/~offline/page.tsx` — страница офлайн для PWA
- ✅ `prisma/schema.prisma` + migration — поля publicShareToken/ExpiresAt/ViewCount в SpecialJournal
- ✅ `src/app/api/projects/[projectId]/journals/[journalId]/share/route.ts` — POST/DELETE шаринг ОЖР
- ✅ `src/app/api/public/journal/[token]/route.ts` — публичное чтение ОЖР без авторизации
- ✅ `src/app/shared/journal/[token]/page.tsx` — публичная страница ОЖР с CTA для ПТО и Прораба
- ✅ `src/components/objects/journals/ShareToPTODialog.tsx` — диалог шаринга с кнопками WhatsApp/Telegram/Email
- ✅ Кнопка «Отправить в ПТО» в JournalPrintMenu

---

### Добавлено (2026-04-21) — MODULE15 Фаза 6: ИД-Мастер ✅

- ✅ `prisma/schema.prisma` — `ExecutionDoc`: поля `publicShareToken`, `publicShareExpiresAt`, `publicShareViewCount`; `DocumentTemplate`: поле `workType`
- ✅ `prisma/migrations/20260421040000_add_module15_phase6/` — SQL-миграция
- ✅ `prisma/seeds/aosr-templates.ts` — 50 шаблонов АОСР в 5 категориях (земляные/бетонные/монтажные/кровельные/отделочные)
- ✅ `src/app/api/estimate-items/[id]/generate-aosr/route.ts` — `POST` генерация АОСР из позиции сметы (feature-gate: `aosr_generation`)
- ✅ `src/app/api/projects/[projectId]/contracts/[contractId]/execution-docs/[docId]/share/route.ts` — `POST`/`DELETE` шаринг документа по публичной ссылке
- ✅ `src/app/shared/execution-doc/[token]/page.tsx` — публичная страница АОСР (просмотр + CTA подписания и регистрации)
- ✅ `src/components/id/CreateAosrWizard.tsx` + `useCreateAosrWizard.ts` — 3-шаговый wizard: выбор шаблона / участники / данные работ (PERSONAL workspace: автоскрытие автонадзора)
- ✅ `src/app/api/dashboard/aosr-stats/route.ts` — статистика АОСР: создано за месяц, % согласовано, в работе
- ✅ `src/components/dashboard/widgets/AosrStatsWidget.tsx` — KPI-виджет для PTO-пользователей (показывается при наличии `execution_docs` feature)
- ✅ `src/app/api/templates/route.ts` — добавлено поле `workType` в select
- ✅ Онбординг PTO готов: роль PTO + планы id_master_basic/pro уже в системе; виджет АОСР появляется автоматически после активации подписки

---

### Добавлено (2026-04-21) — MODULE15 Фаза 5: Реферальная программа 2.0 ✅

- ✅ `prisma/schema.prisma` — 3 новых enum (`RewardType`, `RewardStatus`, `LedgerEntryType`) + 4 модели (`ReferralCode`, `Referral`, `WorkspaceCredit`, `CreditLedgerEntry`); связи в `User`, `Workspace`, `Payment`
- ✅ `prisma/migrations/20260421030000_add_referrals_v2/` — идемпотентная SQL-миграция
- ✅ `src/lib/referrals/generate-code.ts` — `ensureReferralCode(userId)` без nanoid-зависимости
- ✅ `src/lib/referrals/calculate-reward.ts` — `calculateReferralReward` (50/30% same-role, 90/40% cross-role)
- ✅ `src/lib/referrals/process-referral-payment.ts` — начисление кредита рефереру + ledger запись + уведомление
- ✅ `src/lib/referrals/anti-fraud.ts` — `checkReferralFraud` (IP, домен, /24, лимит 10/мес) + `scanRecentReferrals`
- ✅ `src/app/api/referrals/me/route.ts` — GET статистика + POST создать код
- ✅ `src/app/api/referrals/me/list/route.ts` — GET список моих рефералов
- ✅ `src/app/api/referrals/leaderboard/route.ts` — GET публичный топ партнёров
- ✅ `src/app/api/admin/referrals/route.ts` — GET подозрительные + POST confirm/cancel
- ✅ `src/app/api/cron/referral-fraud-scan/route.ts` — cron-сканирование (Bearer CRON_SECRET)
- ✅ `src/app/ref/[code]/page.tsx` — страница приземления: трекинг клика, cookie, CTA регистрации
- ✅ `src/app/(dashboard)/referrals/page.tsx` + `leaderboard/page.tsx` — UI реферальной программы
- ✅ `src/app/(dashboard)/admin/referrals/page.tsx` — admin модерация подозрительных рефералов
- ✅ `src/components/referrals/MyReferralCard.tsx` — карточка кода + статистика + шаринг
- ✅ `src/components/referrals/CrossRoleExplainer.tsx` — образовательный блок кросс-ролевых бонусов
- ✅ `src/components/referrals/ReferralsList.tsx` — таблица приглашений
- ✅ `src/components/referrals/LeaderboardTable.tsx` — рейтинг партнёров
- ✅ Интеграция в `src/app/api/auth/register-solo/route.ts` — привязка нового юзера к Referral при регистрации
- ✅ Интеграция в `src/app/api/webhooks/yookassa/route.ts` — вызов `processReferralReward` при payment.succeeded

---

### Добавлено (2026-04-21) — MODULE15 Фаза 4: Сметчик-Студио MVP ✅

- ✅ `prisma/schema.prisma` + migration — 5 полей публичного шаринга `EstimateVersion` (`publicShareToken`, `publicShareMode`, `publicShareExpiresAt`, `publicShareViewCount`, `publicCompareWithVersionId`)
- ✅ `src/lib/auth.ts` + `src/types/next-auth.d.ts` — `professionalRole` в JWT/сессии
- ✅ `src/middleware.ts` — `/onboarding/:path*` добавлен в matcher
- ✅ `src/app/api/auth/register-solo/route.ts` + `src/app/(auth)/register/solo/page.tsx` — одиночная регистрация без организации с созданием PERSONAL workspace
- ✅ `src/lib/validations/auth.ts` — `soloRegisterSchema`
- ✅ `src/app/(dashboard)/layout.tsx` — redirect новых solo-пользователей на `/onboarding/role`
- ✅ `src/app/api/users/me/onboarding/route.ts` — PATCH `professionalRole`
- ✅ `src/app/api/users/me/onboarding/trial/route.ts` — POST старт 14-дневного триала
- ✅ `src/app/(dashboard)/onboarding/role/page.tsx` + `src/app/(dashboard)/onboarding/plan/page.tsx` — онбординг-визард (роль → тариф)
- ✅ `src/components/onboarding/RoleSelector.tsx` — 7 карточек ролей
- ✅ `src/lib/ui/role-modules.ts` — маппинг `ProfessionalRole → видимые модули`
- ✅ `src/components/objects/ObjectModuleSidebar.tsx` — фильтрация модулей по роли (PERSONAL workspace) + toggle «Показать все»
- ✅ `src/app/api/estimate-versions/[versionId]/share/route.ts` — POST/DELETE публичной ссылки сметы (feature-gate `ESTIMATES_PUBLIC_LINK`)
- ✅ `src/app/api/public/estimate/[token]/route.ts` — публичное чтение сметы без авторизации (rate-limit 60/мин)
- ✅ `src/app/shared/estimate/[token]/page.tsx` — публичная страница просмотра сметы + CTA «Попробовать»
- ✅ `src/components/estimates/ShareEstimateDialog.tsx` — диалог создания/отзыва публичной ссылки
- ✅ `src/lib/subscriptions/lifecycle.ts` — 4 функции lifecycle: `processExpiredTrials`, `processExpiredSubscriptions`, `processExpiredGracePeriods`, `processCanceledExpired`
- ✅ `src/app/api/cron/subscription-lifecycle/route.ts` — cron-эндпоинт (Bearer `CRON_SECRET`), вызывает все 4 lifecycle-функции

---

### Добавлено (2026-04-21) — ЮKassa клиент v2 (SUBSCRIPTION_SYSTEM.md §2) ✅

- ✅ `src/lib/payments/yookassa/client.ts` — кастомный fetch-клиент: Basic auth, retry 3×, exponential backoff, timeout
- ✅ `src/lib/payments/yookassa/types.ts` — полные TypeScript-типы ответов ЮKassa
- ✅ `src/lib/payments/yookassa/errors.ts` — YookassaError / ValidationError / NetworkError
- ✅ `src/lib/payments/yookassa/payments.ts` — createPayment, chargeRecurring, getPayment, capturePayment, cancelPayment
- ✅ `src/lib/payments/yookassa/refunds.ts` — createRefund
- ✅ `src/lib/payments/yookassa/receipts.ts` — buildSubscriptionReceipt с VatCode/PaymentMode enum, ENV YOOKASSA_VAT_CODE
- ✅ `src/lib/payments/yookassa/payment-methods.ts` — getPaymentMethod, deactivatePaymentMethod (DB-only)
- ✅ `src/lib/payments/yookassa/webhooks.ts` — isYookassaIp через ip-cidr (реальный CIDR, не string-prefix)
- ✅ `src/lib/payments/yookassa/legacy-client.ts` — копия старого клиента для будущей миграции
- ✅ `src/app/api/webhooks/yookassa/route.ts` — dual-field OR-lookup, +payment.waiting_for_capture, фикс CANCELLED vs FAILED
- ✅ `package.json` — добавлен ip-cidr

---

### Добавлено (2026-04-21) — MODULE15 Фаза 3: ЮKassa + Биллинг ✅

- ✅ `package.json` — добавлен `@a2seven/yoo-checkout`
- ✅ `.env.example` — `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`, `YOOKASSA_WEBHOOK_SECRET`
- ✅ `src/lib/payments/yookassa-client.ts` — ленивая инициализация клиента ЮKassa
- ✅ `src/lib/payments/create-payment.ts` — фабрика платежей с записью в БД
- ✅ `src/app/api/webhooks/yookassa/route.ts` — webhook с IP-allowlist, идемпотентностью, транзакционной активацией подписки
- ✅ `src/app/api/workspaces/active/subscription/checkout/route.ts` — POST создаёт платёж ЮKassa, возвращает confirmationToken
- ✅ `src/components/subscriptions/PlanCard.tsx` — карточка тарифного плана
- ✅ `src/components/subscriptions/CheckoutForm.tsx` — встраивает виджет ЮKassa, тумблер Месяц/Год
- ✅ `src/app/(dashboard)/settings/subscription/page.tsx` — страница выбора тарифа
- ✅ `src/app/(dashboard)/settings/subscription/SubscriptionStatus.tsx` — текущий статус подписки
- ✅ `src/app/(dashboard)/settings/subscription/checkout/[planId]/page.tsx` — страница оплаты

---

### Добавлено (2026-04-21) — MODULE15 Фаза 2: Подписки и Feature-gate ✅

- ✅ `prisma/schema.prisma` — модели `SubscriptionPlan`, `Subscription`, `Payment`; 6 новых enum (`PlanType`, `ProfessionalRole`, `SubscriptionStatus`, `BillingPeriod`, `PaymentSource`, `PaymentStatus`); расширен `Workspace` (activeSubscriptionId, subscriptions, payments) и `User` (professionalRole, paymentsInitiated)
- ✅ `prisma/migrations/20260421010000_add_subscriptions_payments/` — SQL-миграция
- ✅ `prisma/seeds/subscription-plans.ts` — 7 тарифных планов (FREE, 2×Сметчик-Студио, 2×ИД-Мастер, 2×Прораб-Журнал)
- ✅ `src/lib/subscriptions/errors.ts` — `PaymentRequiredError`, `LimitExceededError`
- ✅ `src/lib/subscriptions/features.ts` — константы `FEATURES` и `LIMIT_KEYS`
- ✅ `src/lib/subscriptions/get-active-plan.ts` — `getActivePlan(workspaceId)` с fallback на FREE
- ✅ `src/lib/subscriptions/require-feature.ts` — `requireFeature`, `hasFeature`
- ✅ `src/lib/subscriptions/require-limit.ts` — `requireLimit`
- ✅ `src/utils/api.ts` — `handleApiError` с 402/403 для PaymentRequiredError/LimitExceededError
- ✅ `src/hooks/use-active-plan.ts` — TanStack Query хук активной подписки
- ✅ `src/hooks/use-feature.ts` — `useFeature(feature)` → `{hasAccess, isLoading, planCode}`
- ✅ `src/components/subscriptions/PaywallBanner.tsx` — баннер «Обнови тариф»
- ✅ `src/components/subscriptions/FeatureGate.tsx` — обёртка условного рендера по фиче
- ✅ `src/app/api/subscription-plans/route.ts` — GET публичный список планов
- ✅ `src/app/api/workspaces/active/subscription/route.ts` — GET активная подписка + usage
- ✅ `src/app/api/workspaces/active/subscription/cancel/route.ts` — POST отмена автопродления
- ✅ `src/app/api/workspaces/[wsId]/subscription/route.ts` — GET подписка по wsId

---

### Добавлено (2026-04-20) — MODULE16 Фаза 6: Mobile-first Shell & Polish ✅

- ✅ `src/components/mobile/MobileShell.tsx` — bottom tab navigation (Журнал / Фото / Дефект / Профиль), safe-area-inset для iPhone X+
- ✅ `src/app/mobile/layout.tsx` — mobile route layout обёртка
- ✅ `src/app/mobile/page.tsx` — список объектов строительства (главный экран)
- ✅ `src/app/mobile/journal/page.tsx` — список журналов объекта
- ✅ `src/app/mobile/journal/[journalId]/new/page.tsx` — быстрая форма записи ОЖР (Textarea + VoiceInput + CameraCapture)
- ✅ `src/app/mobile/photo/page.tsx` — съёмка фото с выбором типа сущности
- ✅ `src/app/mobile/defect/page.tsx` — форма фиксации дефекта (описание + категория + критичность + фото)
- ✅ `src/app/mobile/profile/page.tsx` — профиль, SyncQueuePanel, кнопка выхода, ссылка на desktop
- ✅ `.github/workflows/pwa-audit.yml` — Lighthouse CI на pull_request (PWA ≥ 90)
- ✅ `.lighthouserc.json` — пороги: PWA error ≥ 0.9, perf warn ≥ 0.7, a11y warn ≥ 0.9
- ✅ `tests/e2e/offline.spec.ts` — 3 Playwright теста: офлайн-мутация + sync, кэш страниц, fallback
- ✅ `docs/pwa-test-checklist.md` — ручной чеклист (26 пунктов: install, offline, push, camera, GPS, voice)

---

### Добавлено (2026-04-20) — MODULE16 Фаза 3: Offline-first hooks ✅

- ✅ `src/hooks/use-offline-mutation.ts` — optimistic IDB → fetch API → sync-queue при сбое/офлайн
- ✅ `src/hooks/use-offline-query.ts` — stale-while-revalidate через cacheSnapshotsRepo с TTL
- ✅ `src/hooks/use-create-journal-entry.ts` — пример хука ОЖР (clientId через crypto.randomUUID, markSynced при ответе сервера)
- ✅ `src/components/pwa/SyncQueuePanel.tsx` — Popover-виджет в Header: Badge с кол-вом, список pending/failed, кнопки «Повторить» и «Сбросить ошибки»

---

### Добавлено (2026-04-20) — MODULE16 Фаза 2: IndexedDB + Sync Queue ✅

- ✅ `idb` установлен; `src/lib/idb/db.ts` — схема `stroydocs-offline` v1 (4 stores: sync-queue, offline-journal-entries, offline-photos, cache-snapshots)
- ✅ `src/lib/idb/quota.ts` — `getStorageEstimate()`, `requestPersistentStorage()` (вызов в NetworkListener)
- ✅ `src/lib/idb/repos/` — 4 репозитория: sync-queue-repo, journal-entries-repo, photos-repo, cache-snapshots-repo
- ✅ `src/lib/idb/sync-manager.ts` — процессор очереди: upload фото → API queue, exponential backoff, 4xx-фильтрация, post-process journal entries
- ✅ `src/components/pwa/SyncTrigger.tsx` — автотриггер при `online` + при загрузке; подключён в layout.tsx

---

### Добавлено (2026-04-19) — Консолидация UI объектов

- ✅ Папка `src/app/(dashboard)/projects/` удалена полностью; все UI-страницы живут на канонических URL `/objects/[objectId]/*`
- ✅ 9 компонентов, физически лежавших внутри route-папок (`ContractDetailContent`, `ContractTabsList`/`Content`, `useContractDialogs`, `GanttContent`, `ExecutionDocDetailContent`, `Ks2DetailContent`, `DefectsContent`, `ProjectsContent`), перенесены в `src/components/modules/*`; 2 файла (`ProjectDetailContent`, `ProjectContractsTab`) удалены как мёртвый код
- ✅ 6 реальных страниц (defects, contracts/[cid], gantt, docs/[did], estimates/[iid], ks2/[kid]) перенесены из `projects/[projectId]/` в `objects/[objectId]/`; URL-сегмент в TypeScript-интерфейсах `params` — `objectId`, в тело компонентов значение прокидывается как `projectId` (имя prop совпадает с FK в Prisma)
- ✅ 4 клиентских `router.push` на `/projects/...` (`ImportEstimateDialog` 3×, `EstimateImportHistory` 1×) + `handleBack` в превью сметы переведены на `/objects/...`; `/projects/:path*` убран из `src/middleware.ts` (редиректы в `next.config.mjs` срабатывают раньше middleware)
- ✅ `next.config.mjs` → `redirects()`: `/projects` → `/objects`, `/projects/:id` → `/objects/:id/passport`, `/projects/:id/:path*` → `/objects/:id/:path*` (HTTP 308, сохраняет закладки пользователей)
- ✅ API-путь `/api/projects/[projectId]/*` не трогался — остаётся каноническим (рассинхрон UI↔API — осознанное решение, см. `docs/patterns.md`)

---

### Добавлено (2026-04-19) — Консолидация API объектов

- ✅ Канонический путь API для всех операций над `BuildingObject` — `/api/projects/[projectId]/*`; папка `src/app/api/objects/` удалена целиком (0 `route.ts`)
- ✅ 170 дублирующих маршрутов удалены, 67 уникальных перенесены в каноническое место; поведенческие различия перенесены в `projects/`-версии до удаления (SED views/filters + FTS, TYPE_PREFIX для номеров ИД на русском, changeType в доп. соглашениях с пересчётом суммы договора + НДС, budgetTypeId в источниках финансирования, авторасчёт НДС при создании договора, расширенные include для комментариев ИД и версий смет, и др.)
- ✅ 127 клиентских файлов (`components/*`, `hooks/*`, страниц) переведены с `/api/objects/...` на `/api/projects/...`; фронтовые URL-страницы `/objects/[objectId]/*` не менялись (рассинхрон API и UI URL — осознанное решение: FK в Prisma `projectId`, исторически UI-сегмент `objects`)
- ✅ `tsc --noEmit` зелёный после каждого этапа; `grep '/api/objects' src/` пусто

---
---

# СКВОЗНАЯ ИНФРАСТРУКТУРА (Фазы 1–3.6 ✅)

> Всё что ниже реализовано и работает. Не требует переделки — только переноса в новую структуру URL.

---

### Авторизация и организации ✅

- ✅ Регистрация организации (ИНН, ОГРН, СРО, email, пароль)
- ✅ Вход / выход (NextAuth.js + JWT), защищённые маршруты
- ✅ Роли: admin | manager | worker | controller | customer
- ✅ Приглашение сотрудников по email-ссылке (токен 7 дней)
- ✅ Карточка компании, реестр сотрудников
- ✅ Multi-tenancy: фильтрация по organizationId во всех запросах

---

### Проекты и договоры ✅

- ✅ Список проектов с фильтром и поиском
- ✅ Создание проекта (название, адрес, участники)
- ✅ Иерархия: Проект → Договор → Субдоговор
- ✅ Участники договора (застройщик, подрядчик, авторнадзор)
- ✅ Приказы о назначении ответственных лиц
- ✅ Карточка договора: сводная строка (документы + платежи плановые/факт) + вкладки «Обязательства», «Связанные контракты», «Подробная информация», «Локальные сметные расчёты» (через EstimateContractVersion)
- ✅ Карточка договора расширена: «Платежи» (лимит года, лимит суммы, тип бюджета), «Авансы» (CRUD, тип бюджета, предупреждение об отделении от вкладки Платежи), «Ход исполнения» (CRUD: дата, % выполнения, рабочие, техника), «Доп. соглашения» (changeType: прибавление/замена суммы + авто-пересчёт НДС в транзакции), «Гарантийные удержания» (CRUD, статусы RETAINED/RELEASED/PARTIAL)
- ✅ Карточка договора — 4 новые вкладки + кнопка «Действия»: «Фин. таблицы» (FinancialTableEditor с contentEditable ячейками + debounced PATCH + заполнение из ГПР), «ЗнП» и «ЗнИИ» (ContractDocLink → ProjectDocument, двухшаговый выбор папка/документ), «Информация о контракте» (grid-карточки, amber-выделение поля «Срок действия банковской гарантии»); кнопка «Действия»: создать таблицу финансирования, экспорт в PDF (заглушка), удалить контракт (AlertDialog + CASCADE)

---

### Производство работ ✅

- ✅ КСИ-дерево (многоуровневый справочник, KsiNode)
- ✅ Виды работ (WorkItem) с привязкой к КСИ
- ✅ Записи о выполненных работах (WorkRecord) со списанием материалов
- ✅ Учёт материалов по накладным (остатки, предупреждения при отсутствии сертификата)
- ✅ Загрузка сертификатов и паспортов качества → Timeweb S3
- ✅ Журнал входного контроля (ЖВК) с партионным учётом
- ✅ Акт входного контроля (АВК) — автогенерация по партии
- ✅ Привязка лабораторных испытаний к партиям материала

---

### Фото-отчёты ✅

- ✅ Фото с GPS, дата/время, автор (Photo — полиморфная связь)
- ✅ Съёмка через PWA-камеру (без нативного приложения)
- ✅ Аннотации поверх фото: стрелки, текст, прямоугольники (canvas-редактор)
- ✅ Категории: «Подтверждающие» / «Фиксирующие нарушение»

---

### Исполнительная документация ✅

- ✅ Генерация АОСР, ОЖР, АВК, АТГ (Handlebars → Puppeteer → PDF)
- ✅ Сохранение PDF в Timeweb S3, pre-signed URL (TTL 1 час)
- ✅ Встроенный PDF-просмотрщик (react-pdf, многостраничный)
- ✅ Пакетная генерация АОСР с автоподстановкой объёмов
- ✅ Автозаполнение разделов 3 и 5 ОЖР из АОСР
- ✅ Умное формирование реестров ИД с нумерацией листов
- ✅ Пакетный экспорт (мердж акта + приложения в единый PDF)
- ✅ Шаблоны документов .docx (docxtemplater + pizzip, DocumentTemplate)
- ✅ Редактор полей акта (overrideFields / overrideHtml / TipTap WYSIWYG)
- ✅ Штамп «Копия верна» на PDF (ФИО, должность)
- ✅ Иерархические категории ИД (`IdDocCategory`): дерево категорий проекта + шаблоны на уровне организации, импорт шаблонов, фильтрация АОСР/ОЖР по категории (панель `IdCategoryTree` слева в таблице документов + CRUD API + API шаблонов организации) — миграция `add_id_categories`
- ✅ Вкладка «Связанные документы» в карточке ИД: модель `ExecutionDocLink` (junction table, CASCADE), API GET/POST/DELETE (`/execution-docs/[docId]/linked-docs`), компоненты `LinkedDocsTab` + `AddLinkedDocDialog` + `useLinkedDocs`; карточка ИД переведена на tab-layout (8 вкладок: Документ | Согласование | Подписание | Замечания | Версии | ТИМ | Связанные документы | Сохр. реквизиты) — миграция `add_execution_doc_links`
- ✅ Расширенная система замечаний к ИД: поля `commentNumber` / `urgency` / `remarkType` / `responsibleId` / `watcherIds` / `plannedResolveDate` / `actualResolveDate` / `suggestion` / `attachmentS3Keys`; модель `DocCommentReply` (ответы на замечания); API endpoints `replies` (GET/POST), `accept` (→RESOLVED + resume approval), `return` (→OPEN + PENDING_REMARKS); статус `PENDING_REMARKS` в `ApprovalRouteStatus` (приостановка согласования при наличии открытых замечаний, автовозобновление при закрытии всех); UI — Sheet с вкладками «Информация / Ответы», расширенная форма создания, счётчик только открытых замечаний на вкладке — миграция `extend_doc_comments`
- ✅ Вкладка «Подписание» в карточке ИД (подготовка к КриптоПро CSP): модели `SigningRoute` + `SigningStep` (БД), enum `SigningRouteStatus`/`SigningStepStatus`; API `GET/DELETE .../signing` (маршрут), `POST .../signing/start` (запуск, body: signerIds | templateId), `POST .../signing/sign` (заглушка → 501 КриптоПро); `GET /api/signing-templates` (3 предустановленных шаблона); UI `SigningTab.tsx` — выбор по шаблону или вручную (чекбоксы сотрудников), таблица подписантов (ФИО / должность / сертификат / статус / дата), кнопка «Подписать (ЭЦП)» с информационным сообщением, сброс маршрута; защита удаления: документ на подписании удалить нельзя — миграция `add_signing_routes`

---

### Workflow согласования ✅

- ✅ Многоуровневый маршрут (ApprovalRoute + ApprovalStep)
- ✅ Роли: Подрядчик → Генподрядчик → Проектировщик → Стройконтроль → Заказчик
- ✅ Статусы: Создан → На согласовании → Согласован → Подписан / Отклонён
- ✅ История согласования с датами и ФИО
- ✅ Сброс согласования и перезапуск

---

### КС-2 / КС-3 ✅

- ✅ КС-2: привязка к договору, смете, периоду; автозаполнение из WorkItems
- ✅ КС-3: автогенерация как сумма КС-2
- ✅ HTML-шаблоны (/templates/ks2.hbs, /templates/ks3.hbs)
- ✅ Вкладка «ДЗ сметы»: таблица EstimateAdditionalCost из смет договора, чекбоксы исключения, пересчёт суммы КС-2 (Ks2AdditionalCostsTab, excludedAdditionalCostIds, GET .../additional-costs)
- ✅ Корректировочный акт: поле «Корректировка к акту» (Select КС-2 в шапке), печатная форма «КОРРЕКТИРОВОЧНЫЙ АКТ» с разницей стоимостей (correctionToKs2Id, ks2.hbs)

---

### Парсинг смет ✅

- ✅ XML Гранд-Сметы (xml2js, без GPT, детерминированно)
- ✅ Excel .xlsx (exceljs → чанки по 20 строк → YandexGPT)
- ✅ PDF (pdf-parse → YandexGPT), Gemini fallback
- ✅ Экран предпросмотра перед записью в БД
- ✅ Автопривязка позиций к КСИ-дереву
- ✅ API управления категориями смет (CRUD, иерархия, защита от удаления непустых)
- ✅ Фильтрация версий смет по категориям, обновление status/categoryId через PATCH
- ✅ Проверка связи с ГПР при удалении версии сметы

---

### Безопасность и инфраструктура ✅

- ✅ CORS, валидация env-переменных при старте
- ✅ Пагинация критичных роутов (лимит 50, макс 200)
- ✅ Индексы БД: WorkRecord@@index([date]), ExecutionDoc@@index([status])
- ✅ ФЗ-152: все данные только на Timeweb Cloud (РФ)
- ✅ Токены приглашений с истечением (7 дней)

---
---

# МОДУЛИ СИСТЕМЫ

---
---

## МОДУЛЬ 1 — Дашборд и рабочее пространство ✅

> **Аналог:** ЦУС → Стартовая страница → Дашборд (виджеты)
> **Ориентир:** 1–2 недели

- ✅ Базовый dashboard (главная страница) — KPI-карточки + виджеты
- ✅ Виджет «Объекты» — карточки с % готовности ИД
- ✅ Виджет «Карта» — геолокация объектов на Яндекс.Картах (MapWidget + NEXT_PUBLIC_YANDEX_MAPS_API_KEY)
- ✅ Виджет «Воронка ИД»: Выполнено → В ИД → Подписанные (IdReadinessWidget)
- ✅ Виджет «Замечания СК» — счётчик открытых по объектам (DefectsMonitorWidget)
- ✅ Виджет «Выполнение СМР»: план/факт/отклонение по месяцам (SmrProgressWidget)
- ✅ Персонализация: drag-and-drop (@dnd-kit), скрытие виджетов (DashboardWidgetsManager)
- ✅ Лента событий (ActivityFeed на дашборде)
- ✅ Панель фильтров на дашборде (правая боковая панель: регион, тип, статус) (DashboardFilterPanel)
- ✅ Страница /inbox — входящие документы для согласования (InboxPage + ApprovalRoute-фильтр)
- ✅ In-app уведомления со счётчиком в sidebar (useUnreadCount + SidebarNav badge)
- ✅ Выпадающая панель уведомлений (NotificationDropdown) в шапке sidebar
- ✅ In-app уведомления: Popover-дропдаун в sidebar — последние 10 уведомлений, иконка по типу, относительное время, «Отметить все как прочитанные», ссылка «Все уведомления» (`NotificationDropdown.tsx`, badge-счётчик, collapsed-режим с точкой)
- ✅ Панель фильтрации дашборда (DashboardFilterPanel): сворачиваемая правая панель 280px, 4 фильтра с поиском — Проекты / Статус / Регион / Тип объекта; фильтрация виджета «Объекты» через API objectIds (ЦУС стр. 13-14)
- ✅ In-app уведомления со счётчиком в sidebar (useUnreadCount + SidebarNav badge)
- ✅ Страница «Входящие» (/inbox) — все документы ожидающие действия текущего пользователя в workflow согласования (ApprovalStep WAITING + фильтр по currentStepIdx + группировка по категориям ИД/Переписка/СЭД/ПИР/Журналы + синий badge в sidebar)
- ✅ Email-уведомления (BullMQ + SMTP + notification.worker.ts)
- ✅ Уведомление следующему участнику цепочки согласования (approval/decide + lib/approval/notify.ts)
- ✅ Уведомление о дате освидетельствования за ≥3 рабочих дня (inspection-reminder.worker.ts, ГОСТ Р 70108-2025)
- ✅ Единый API агрегаций дашборда — 15 виджетов в одном запросе (GET /api/dashboard/analytics?objectIds[]=&year=&period=quarter|halfyear|year&mode=separate|cumulative, Promise.all, кэш Redis 5 мин)
- ✅ Виджет «База объектов» — сводная таблица статусов (N объектов + кол-во/% по ACTIVE/COMPLETED/ARCHIVED), клик на строку фильтрует дашборд (ObjectsBaseWidget, callback onStatusFilter)
- ✅ Виджет «Карта объектов» — 3 вкладки: Схема (SVG-карта 8 ФО РФ с тепловой картой по кол-ву объектов), Таблица (сортируемые колонки + переход в паспорт), Карта (Яндекс.Карты)
- ✅ Виджеты аналитики ГПР (ЦУС стр. 314–321): `GprAnalyticsWidget` (stage: PIR | SMR) — LineChart 5 линий (план / факт выполнения / отклонение выполнения / факт освоения / отклонение освоения), фильтр по году и произвольному периоду, масштаб (квартал/полугодие/год), накопительный и отдельный расчёт, toggle линий через кастомную легенду; данные из DASH.1 API (`gprPirAnalytics` / `gprSmrAnalytics`)
- ✅ Виджеты мониторинга (ЦУС стр. 323–328): GprMonitoringWidget (таблица-светофор по объектам ГПР: зелёный/жёлтый/красный по дням отставания, модал с колонками Объект/даты/проценты/отставание) + SkMonitoringWidget mode=chart (PieChart категорий недостатков СК, donut с total в центре, drill-down модал) + SkMonitoringWidget mode=table (таблица категорий × статусов Закрыто/Активно/Требуется проверки, строка Итого, drill-down модал); новый API GET /api/dashboard/sk-drill

**База данных (Модуль 1)**
- ✅ `DashboardWidget` (userId, type, position, config Json)
- ✅ `Notification` (userId, type, title, body, readAt, entityType, entityId)

---

## МОДУЛЬ 2 — Паспорт объекта

> **Аналог:** ЦУС → Паспорт объекта (вкладки: Паспорт, Показатели, Финансирование, Контракты, Задачи, Фото)
> **Ориентир:** 2–3 недели
> **Реструктуризация 2026-04-10:** вкладки Паспорт, Показатели, Финансирование, Задачи, Фотогалерея объединены в Модуль 3 «Информация» (URL `/objects/[id]/info/*`). Компоненты остались прежними — только навигация изменена.

### Вкладка «Паспорт»
- ✅ Название, адрес, участники
- ✅ Кадастровый номер, площадь, класс ответственности (PassportView + поля в Project)
- ✅ Разрешение на строительство (№, дата, орган выдачи) (PassportView — permitNumber, permitDate, permitAuthority)
- ✅ Расширенные реквизиты: `constructionType` (тип строительства), `shortName` (краткое наименование), `region` (субъект РФ), `stroyka` (стройка)
- ✅ Виджет ПИР: % выполнения, плановые/фактические даты, динамика (PirWidget + passport/widgets API)
- ✅ Виджет СМР: % освоения, сумма КС-2, отклонение от плана (SmrWidget)
- ✅ Геолокация объекта: координаты, карта (CoordinatesMap + AddCoordinateDialog)
- ✅ График реализации: информационная панель объекта (сворачиваемая шапка, ЦУС стр. 20-21)
- ✅ Секция «Карта и координаты» — react-leaflet карта (OSM tiles), мультиточечные маркеры из ProjectCoordinate (очередь строительства), Nominatim geocoding по адресу объекта, контекстное меню маркера (Изменить / Удалить), диалог добавления/редактирования точки
- ✅ Секция «График реализации» — полоса стадий (Экспертиза, Обследование, Изыскания, ПД, СМР, Ввод) с Badge + div-прогресс-бар плана СМР по плановым датам паспорта
- ✅ Кнопки действий в шапке: «Печатная форма» (POST /info-report/generate-pdf, заглушка 501), «Сводный отчёт» (placeholder), «История загрузок» (placeholder)
- ✅ Виджет «ПИР»: общая сумма ПИР-контрактов (по имени категории), освоение (акты закрытия ПИР SIGNED), % выполнения, дата плана, отклонение ▲/▼ в рублях (PirWidget + GET /api/projects/[projectId]/passport/widgets)
- ✅ Виджет «СМР»: общая сумма контрактов, освоение (КС-2 APPROVED), % выполнения, даты начала/окончания, отклонение ▲/▼ в рублях (SmrWidget + usePassportWidgets)
- ✅ Тип строительства (Select: Новое строительство / Реконструкция / Капитальный ремонт / Техническое перевооружение)
- ✅ Регион (Select из 85 субъектов РФ по ОКТМО, `RF_SUBJECTS` в constants.ts)
- ✅ Стройка (Input, используется в реквизитах КС-2, КС-3)
- ✅ Широта / Долгота (number inputs, отображаются в PassportView как «ш, д»)
- ✅ Фактические даты начала / окончания строительства (actualStartDate, actualEndDate)
- ✅ Чекбокс «Заполнять даты из актуальной версии ГПР» (fillDatesFromGpr)
- ⬜ Автопроверка контрагентов по ИНН через API ФНС/ЕГРЮЛ (кэш Redis 24ч)
- ✅ Тип строительства, краткое наименование, стройка (реквизиты КС-2/КС-3) — поля constructionType, shortName, stroyka
- ✅ Регион (субъект РФ), геолокация (latitude/longitude) — поля region, latitude, longitude; @@index([region])
- ✅ Фактические даты начала/окончания, опция «заполнять даты из ГПР» — actualStartDate, actualEndDate, fillDatesFromGpr
- ✅ Связанные объекты / суб-объекты — иерархия через parentId/children (ObjectHierarchy, @@index([parentId]))

### Вкладка «Показатели»
- ✅ KPI: количество договоров, записей о работах, ИД, сумма КС-2 (IndicatorsView)
- ✅ Дефицит ИД: прогресс-бар готовности ИД по договорам (IndicatorsView)
- ✅ Конфигурируемые показатели ЦУС по группам (ProjectIndicator — ручной/автоматический ввод)
- ✅ Конфигурируемые показатели по 8 группам ЦУС — аккордеон (ProjectIndicatorsView)
- ✅ CRUD показателей: AddIndicatorDialog / EditIndicatorDialog (React Hook Form + Zod)
- ✅ Автозаполнение «Контракты ПИР» из Contract (name ILIKE '%ПИР%', status ACTIVE/COMPLETED)
- ✅ Автозаполнение «ТУ для строительства» из TechnicalCondition
- ✅ Прикрепление файлов к показателям (fileKeys String[] → Timeweb S3)
- ⬜ Дефицит ИД детализация: «Бетонные работы — выполнено 80%, ИД 30%, нехватает АОСР: 12 шт.»

### Вкладка «Финансирование»
- ✅ Реестр источников (бюджет, внебюджет, кредиты) — FundingView с CRUD
- ✅ Риски неосвоения лимитов — отдельная вкладка /info/limit-risks (реализована в Модуле 3)

### Вкладка «Риски неосвоения лимитов» ✅
- ✅ Таблица (DataTable): год, статус, сумма, 5 бюджетных полей (фед./рег./местный/внебюдж./собств.), причина риска, предложения по исключению, контракт, возможная дата завершения освоения
- ✅ Диалог добавления / редактирования (единый): Select года, 5 числовых input бюджетов, auto-totalAmount, Textarea причины (required), Textarea предложений, Select контракта из договоров объекта, Input type=date дата завершения
- ✅ API GET/POST `/api/projects/[projectId]/limit-risks` — список с `include contract`, создание, расчёт totalAmount на сервере
- ✅ API PATCH/DELETE `/api/projects/[projectId]/limit-risks/[id]` — partial update с пересчётом totalAmount, удаление
- ✅ Кнопка печати (window.print()) рядом с «+ Добавить»
- ✅ Prisma-модель `LimitRisk` (уже была в схеме) — подключена

### Вкладка «Контракты»
- ✅ Список договоров (переиспользуется)

### Вкладка «Задачи»
- ✅ Задачи по объекту (ответственный, срок, статус) — TasksView с полным CRUD
- ⬜ Создание задачи из замечания СК (автосвязь)

### Вкладка «Строительный контроль» ✅
- ✅ Read-only реестр недостатков из модуля СК (PassportSkView)
- ✅ Левая панель (200px): счётчики по статусам — Всего / Открыто / В работе / Устранено / Подтверждено
- ✅ TanStack Table: №, Кем выдано, Описание недостатка, Срок устранения, Контроль устранения, Статус (Badge), Мероприятия
- ✅ Данные из GET /api/projects/[pid]/defects (переиспользование API Модуля 11)
- ✅ Маршрут: `/objects/[objectId]/passport/sk`

### Вкладка «Проблемные вопросы» ✅
- ✅ Реестр проблемных вопросов (CRUD) по 7 типам (ГОСТ Р 70108-2025 / ЦУС стр. 30)
- ✅ Типы: Корректировка ПСД, Земельно-правовые, Производственные, Орг.-правовые, Договорная работа, Финансовые, Прочие
- ✅ Статусы: ACTIVE / CLOSED с автоматической фиксацией `closedAt`
- ✅ Двухпанельный UI: сводка по типам + TanStack DataTable
- ✅ Диалог создания: Select тип, Textarea описание, Input исполнитель, DatePicker срок
- ✅ API: GET/POST `/api/projects/[projectId]/problem-issues/` + PATCH/DELETE `…/[id]/`
- ✅ Multi-tenancy: проверка organizationId через BuildingObject

### Вкладка «Фотогалерея»
- ✅ Фотоотчёты с GPS (переиспользуется)
- ⬜ Хронологическая лента, сравнение «было / стало»

### Печатная форма (информационный отчёт)
- ✅ Handlebars-шаблон `templates/info-report.hbs` (A4 портрет: стадии, ПИР, СМР, финансирование, проблемы, ситуация на объекте)
- ✅ Генератор `src/lib/info-report-pdf-generator.ts` (Puppeteer + Promise-кэш шаблона)
- ✅ API `POST /api/projects/[projectId]/info-report/generate-pdf` → pre-signed URL (Timeweb S3)

### Инфраструктура (Модуль 2)
- ✅ loading.tsx + error.tsx для всех 13 вкладок (/objects/[objectId]/*)
- ✅ Мобильный layout — адаптивный sidebar с гамбургер-меню (ObjectModuleSidebar)
- ✅ Сворачиваемая информационная панель объекта (ObjectInfoHeader, ЦУС стр. 20–21) — отображается вверху каждого модуля; свёрнута по умолчанию (localStorage); при раскрытии — 4 мини-виджета (Оплачено по контрактам, Выполнение по графикам, Освоение ПИР, Освоение СМР/КС-2) + сводка по предписаниям / ИД / проектной документации; навигация ← → между объектами с сохранением пути модуля
- ✅ GET /api/projects/[projectId]/summary — агрегация данных для панели: суммы контрактов + FACT-оплаты, ГПР (amount × progress), КС-2 (APPROVED), счётчики ИД и ПД по статусам, prev/nextObjectId; кэш Redis 5 мин
- ✅ ObjectModuleSidebar обновлён: Паспорт/Показатели/Финансирование/Задачи/Фото убраны как отдельные пункты → единый «Информация» (2026-04-10)
- ✅ Tab-навигация паспорта: `passport/layout.tsx` (Задачи / Проблемные вопросы / Фотогалерея)

**База данных (Модуль 2)**
- ⬜ `ObjectPassport` отдельная модель (поля добавлены в BuildingObject напрямую)
- ✅ `BuildingObject` расширен: `constructionType`, `region`, `stroyka`, `shortName`, `latitude`, `longitude`, `actualStartDate`, `actualEndDate`, `fillDatesFromGpr`, `parentId` + самосвязь `ObjectHierarchy` — миграция `add_object_fields_audit`
- ✅ `FundingSource` (projectId, type, amount, period)
- ✅ `FundingRecord` (projectId, year, recordType ALLOCATED/DELIVERED, federal/regional/local/own/extraBudget) + enum `FundingRecordType`
- ✅ `LimitRisk` (projectId, contractId?, year, totalAmount, бюджеты по источникам, riskReason, resolutionProposal)
- ✅ `Task` (projectId, contractId, assigneeId, title, status, deadline, priority) + расширение: parentTaskId, order, level, versionId — модель в schema.prisma
- ✅ `ProblemIssue` (projectId, type, status, description, resolution, responsible, deadline, closedAt, authorId) + enum `ProblemIssueType` (7 значений) + `ProblemIssueStatus` — миграция `20260409000000_add_problem_issues`
- ✅ `ProjectIndicator` (groupName, indicatorName, value, comment, maxValue, fileKeys[], sourceType MANUAL/AUTO, projectId) + enum `IndicatorSource`
- ✅ `ProjectCoordinate` (projectId, latitude, longitude, constructionPhase?) — миграция `20260409120000`

---

## МОДУЛЬ 3 — Информация и СЭД ✅

> **Аналог:** ЦУС → Модуль «Информация» + Модуль «СЭД»
> **Статус:** ✅ Завершён (все вкладки реализованы)

### Архитектура модуля «Информация»
- ✅ Единый модуль `/objects/[objectId]/info/` с 12 вкладками (restructured navigation)
- ✅ Сворачиваемая информационная шапка объекта (ЦУС стр. 20-21)

### Вкладка «Общая информация»
- ✅ Основные реквизиты объекта, карта (Яндекс.Карты), координаты
- ✅ График реализации: таймлайн стадий (ImplementationTimeline)
- ✅ Кнопки действий: «Печатная форма», «Экспорт» и др.

### Вкладка «Участники»
- ✅ Реестр организаций-участников объекта (ObjectOrganization с ролями)
- ✅ Реестр физических лиц (ObjectPerson: ФИО, должность, документ о назначении)
- ✅ Роли: Заказчик, Застройщик, Генподрядчик, Субподрядчик, Авторский надзор, Технический надзор, Строительный контроль, Проектировщик, Экспертная организация
- ⬜ Автопроверка членства в СРО (реестр НОСТРОЙ)
- ⬜ Проверка специалистов в НРС

### Вкладка «Финансирование» (в модуле Информация)
- ✅ Записи финансирования по годам (FundingRecord: федеральный / региональный / местный / внебюджет)
- ✅ Типы: ALLOCATED (выделено) / DELIVERED (освоено)
- ✅ CRUD: создание, редактирование, удаление

### Вкладка «Риски неосвоения лимитов»
- ✅ Реестр рисков по годам (LimitRisk: сумма под риском, причина, предложение, дата)
- ✅ Привязка к договору, разбивка по источникам финансирования

### Вкладка «Земельные участки и ТУ»
- ✅ Реестр земельных участков (LandPlot: кадастровый номер, площадь, категория, разрешённое использование, обременения, арендатор)
- ✅ Технические условия (TechnicalCondition: тип ТУ, выдавшая организация, срок действия, статус подключения)

### Вкладка «Показатели»
- ✅ Конфигурируемые показатели ЦУС по группам (ProjectIndicator — ручной/автоматический ввод)
> **Аналог:** ЦУС → Модуль «Информация» (12 вкладок) + Модуль «СЭД»
> **Ориентир:** 2–3 недели

### Вкладка «Участники» ✅ (2026-04-10)
- ✅ Двухколоночный layout: юрлица / физлица (прямая привязка к объекту, не через договоры)
- ✅ Справочник из 9 ролей ЦУС (Заказчик, Застройщик, Генподрядчик, Субподрядчик, Авторский надзор, Технический надзор, Строительный контроль, Проектировщик, Экспертная организация)
- ✅ Добавление / удаление ролей через Popover-меню (Badge с × для удаления)
- ✅ Физические лица: ФИО, привязка к организации, опциональная привязка к системному пользователю
- ✅ Документ о назначении: Приказ, Доверенность, Распоряжение, Постановление, Решение, Устав
- ✅ Загрузка файла документа о назначении (Timeweb S3), иконка FileText серая/синяя
- ✅ Поиск участников (по названию/ФИО/ИНН) + фильтр по роли
- ✅ Копирование участника в другой объект (CopyParticipantDialog)
- ✅ Поиск организаций по всей системе (GET /api/organizations/search)
- ✅ Создание новой организации прямо из диалога (name, INN, address)
### Инфраструктура навигации ✅ (2026-04-10)
- ✅ Единый пункт «Информация» в боковой панели (убраны 5 отдельных пунктов)
- ✅ `info/layout.tsx`: 12 скроллируемых вкладок (overflow-x-auto) + кнопка ▾ (выпадающий список)
- ✅ Редиректы: `/passport` → `/info/general`, `/indicators` → `/info/indicators`, `/funding` → `/info/funding`, `/tasks` → `/info/tasks`, `/photos` → `/info/photos`

### Вкладка «Информация» (/info/general)
- ✅ PassportView: название, адрес, участники, кадастровый номер, площадь, класс ответственности
- ✅ Разрешение на строительство (№, дата, орган выдачи)
- ⬜ Автопроверка контрагентов по ИНН через API ФНС/ЕГРЮЛ (кэш Redis 24ч)
- ⬜ Связанные объекты (суб-объекты)

### Вкладка «Показатели» (/info/indicators)
- ✅ KPI: количество договоров, записей о работах, ИД, сумма КС-2 (IndicatorsView)
- ✅ Дефицит ИД: прогресс-бар готовности ИД по договорам
- ⬜ Дефицит ИД детализация: «Бетонные работы — выполнено 80%, ИД 30%, нехватает АОСР: 12 шт.»

### Вкладка «Участники» (/info/participants)
- ✅ Реестр организаций с ролями (переиспользуется)
- ⬜ Автопроверка членства в СРО (реестр НОСТРОЙ)
- ⬜ Проверка специалистов в НРС

### Вкладка «Задачи» (/info/tasks)
- ✅ Задачи по объекту (ответственный, срок, статус) — TasksView с полным CRUD
- ⬜ Создание задачи из замечания СК (автосвязь)

### Вкладка «Деловая переписка» (/info/correspondence)
- ✅ Реестр официальных писем (входящие / исходящие)
- ✅ Создание письма с маршрутом согласования
- ✅ Авто-нумерация по шаблону организации
- ✅ Полный UI: список, карточка, диалог создания, фильтры (CorrespondenceView + хуки)

### Вкладка «РФИ (Запросы на разъяснение)»
- ✅ Запросы на разъяснение, назначение ответственного, сроки

### Вкладка «Вопросы (Проблемные вопросы)»
- ✅ Реестр проблемных вопросов в контексте модуля «Информация»
- ✅ Типы по классификатору ЦУС, статусы, ответственные организации

### Вкладка «Видеонаблюдение»
- ✅ Реестр камер видеонаблюдения (VideoCamera: название, URL потока, локация, активность)
- ✅ Встроенный видеоплеер (iframe/HLS)

### Вкладка «Файлы»
- ✅ Файловое хранилище (переиспользует ProjectFolder / ProjectDocument)

### Вкладка «Фото»
- ✅ Фотогалерея объекта (переиспользует Photo модуль)
### Модуль «СЭД» (/objects/[id]/sed/)
- ✅ Документооборот произвольного типа: черновик → согласование → подписан → архив
- ✅ Полнотекстовый поиск (PostgreSQL tsvector)
- ✅ Карточки документооборота (SEDWorkflow): типы ДО (7), статусы (5), участники, наблюдатели
- ✅ Регламент маршрута согласования (WorkflowRegulation: шаблон шагов Json)
- ✅ Папки для группировки документов (SEDFolder, самоссылка для вложенности)
- ✅ Связь документ↔папка many-to-many (SEDDocumentFolder)
- ✅ Полиморфные связи документа с сущностями (SEDLink: entityType, entityId)
- ✅ Основания ДО→ДО (SEDDocumentBasis)
- ✅ Сообщения участников в карточке ДО (SEDWorkflowMessage)
- ✅ Расширены поля SEDDocument: входящий/исходящий номер, дата, физлица-отправитель/получатель, организация-получатель, isRead, наблюдатели

### СЭД — UI карточки ДО ✅ (2026-04-10)

**Новые компоненты:**
- ✅ `WorkflowCard.tsx` + `useWorkflowCard.ts` — 2-панельная карточка ДО (60/40): история маршрута, кнопки действий (Согласовать/Отклонить/Перенаправить), чат участников, поля документа, статус, «Отправить в ДО»
- ✅ `CreateWorkflowDialog.tsx` — диалог создания ДО: 3 вкладки (По типу / По регламенту / С параметрами)
- ✅ `RedirectDialog.tsx` — диалог перенаправления ДО (Select пользователь + комментарий)
- ✅ `SEDDocumentCard.tsx` обновлён: WorkflowCard отображается при выборе ДО в ленте; кнопка «Создать ДО» в шапке

### СЭД — Карточки документооборота (ДО) ✅ (2026-04-10)

**API роуты карточки ДО (`/api/projects/[projectId]/sed/[docId]/workflows/`):**
- ✅ GET + POST — список и создание ДО по типу (sequential/parallel/single режимы)
- ✅ POST `/by-regulation` — создание ДО по регламенту организации (stepsTemplate из WorkflowRegulation)
- ✅ POST `/with-params` — предобновление параметров документа (receiverOrgId, incomingNumber, receiverUserId)
- ✅ GET `/[wid]` — карточка ДО с маршрутом, шагами, сообщениями, основаниями
- ✅ POST `/[wid]/approve` — согласование (последовательный режим + параллельный MULTI_APPROVAL/MULTI_SIGNING)
- ✅ POST `/[wid]/reject` — отклонение (с обязательным комментарием, уведомление инициатора)
- ✅ POST `/[wid]/redirect` — перенаправление другому участнику (новый ApprovalStep + уведомление)
- ✅ POST `/[wid]/create-on-basis` — новое ДО на основании (SEDWorkflow + SEDDocumentBasis)
- ✅ GET + POST `/[wid]/messages` — сообщения в карточке ДО (пагинация, проверка авторства)
- ✅ DELETE `/[wid]/messages/[msgId]` — удаление сообщения (только автор)
- ✅ POST `/[wid]/print` — PDF листа согласования (Handlebars + Puppeteer, `templates/sed/approval-sheet.hbs`)

**API роуты регламентов (`/api/organizations/[orgId]/workflow-regulations/`):**
- ✅ GET + POST — список и создание регламентов (POST только ADMIN)
- ✅ GET + PUT + DELETE `/[regId]` — карточка, обновление, удаление (DELETE блокируется при активных ДО)

**Вспомогательная инфраструктура:**
- ✅ `getNextSEDWorkflowNumber()` в `src/lib/numbering.ts` (формат `ДО-{год}-{NNN}`, advisory lock)
- ✅ `src/lib/sed-workflow-pdf-generator.ts` — PDF генератор (Promise-кэш шаблона, Puppeteer)
- ✅ `templates/sed/approval-sheet.hbs` — Handlebars шаблон листа согласования А4 (8 колонок: ФИО, Должность, Организация, Действие, Дата, Результат, Комментарий + блок подписи автора)

**UI регламентов:**
- ✅ `WorkflowRegulationsView.tsx` — таблица регламентов в настройках организации (вкладка «Регламенты ДО»)
- ✅ `CreateRegulationDialog.tsx` — диалог создания регламента с DnD-конструктором шагов (`@dnd-kit/sortable`)

**Логика типов ДО:**
- APPROVAL: последовательные шаги (stepIndex 0, 1, 2...), один участник за раз
- MULTI_APPROVAL / MULTI_SIGNING: параллельные шаги (все stepIndex=0), завершение при всех APPROVED
- DELEGATION / REDIRECT / REVIEW / DIGITAL_SIGNING: один шаг, один участник

### Вкладка «Чат»
- ✅ API роуты: список (GET), создание (POST), просмотр/обновление/удаление (GET/PATCH/DELETE)
- ✅ Расширенная логика видимости: author / senderOrg / receiverOrg / observers / workflow-участники (6 условий OR)
- ✅ Views: `all` | `active` | `requires_action` | `participating` | `sent_by_me`
- ✅ Фильтры: folderId, status, docType, полнотекстовый поиск
- ✅ Авто-отметка `isRead = true` при первом открытии получателем
- ✅ Bulk mark-read: `POST /sed/[docId]/mark-read` — массовая отметка `{ documentIds, isRead }`
- ✅ Папки: CRUD `/sed/folders` + `/sed/folders/[folderId]` (дерево с parentId, счётчик документов)
- ✅ Привязка документов к папкам: `POST/DELETE /sed/[docId]/folders/[folderId]`
- ✅ Связи (SEDLink): `GET/POST /sed/[docId]/links` + `DELETE /links/[linkId]` (полиморфные, uniqueness guard)
- ✅ Вложения: `GET /sed/[docId]/attachments` (список с presigned URL) + `GET/DELETE /attachments/[attachmentId]` (удаление только черновиков)
- ✅ `CreateSEDDocumentDialog.tsx` — полноэкранный диалог создания (тип, отправитель/получатель физлицо + организация, номер, дата, TipTap текст, TagInput тэги, Dropzone + S3 вложения)
- ✅ `TagInput.tsx` (shared) — компонент ввода тэгов: Enter/запятая → Badge с ×, Backspace для удаления
- ✅ `GET /api/projects/[projectId]/sed/next-number` — предпросмотр следующего номера без advisory lock
- ✅ `createSEDSchema` расширена: `senderUserId`, `receiverUserId`, `receiverOrgId`, `date`, `number` (кастомный override)
- ✅ SEDDocumentCard — полноэкранная карточка документа (5 вкладок: Информация, Параметры, Подписание, Связи, Основания; лента ДО, боковая панель 280px, авто-маркировка isRead)

### Вкладка «Чат» (/info/chat — не в основных табах)
- ✅ Групповой чат по проекту / договору (Socket.io, порт 3001)
- ⬜ Прикрепление документа из системы к сообщению

### Модуль «СЭД»
- ✅ Документооборот произвольного типа: черновик → согласование → подписан → архив
- ✅ Полнотекстовый поиск (PostgreSQL tsvector)

**База данных (Модуль 3)**
- ✅ `Correspondence`, `CorrespondenceAttachment` (tsvector-поиск)
- ✅ `RFI`, `RFIAttachment`
- ✅ `SEDDocument` (incomingNumber, outgoingNumber, date, senderUser, receiverUser, receiverOrg, isRead, readAt, observers), `SEDAttachment` (tsvector-поиск)
- ✅ `SEDFolder`, `SEDDocumentFolder` (папки с иерархией parentId, many-to-many)
- ✅ `SEDLink` (полиморфная связь entityType + entityId, @@unique constraint)
- ✅ `SEDWorkflow` (workflowType, status, participants[], observers[], approvalRouteId, regulationId)
- ✅ `SEDWorkflowMessage`, `SEDDocumentBasis` (основание ДО→ДО)
- ✅ `WorkflowRegulation` (organizationId, stepsTemplate Json [{role, userId?}])
- ✅ Enum `WorkflowType` (DELEGATION | APPROVAL | REDIRECT | MULTI_APPROVAL | MULTI_SIGNING | DIGITAL_SIGNING | REVIEW)
- ✅ Enum `SEDWorkflowStatus` (CREATED | IN_PROGRESS | APPROVED | REJECTED | COMPLETED)
- ✅ `ChatMessage`
- ✅ `LandPlot` (cadastralNumber, area, landCategory, ГПЗУ, ЕГРН, обременения, ownerOrg/tenantOrg)
- ✅ `TechnicalCondition` (type, number, issueDate, expirationDate, issuingAuthority, responsibleOrg)
- ✅ `FundingRecord` (year, recordType ALLOCATED/DELIVERED, федеральный/региональный/местный/внебюджет) + `LimitRisk` (год, сумма, причина, предложение, привязка к договору)
- ✅ `VideoCamera` (rtspUrl, httpUrl, operationalStatus, cameraModel, authorId)
- ✅ `ObjectOrganization` (прямая привязка юрлица к объекту, @@unique[buildingObjectId, organizationId])
- ✅ `ObjectPerson` (ФИО, привязка к org и User) + `ObjectParticipantRole` + `PersonAppointment` (документ о назначении, файл S3)
- ✅ enum `AppointmentDocType` (ORDER, POWER_OF_ATTORNEY, DECREE, REGULATION, DECISION, CHARTER)
- ✅ `ProjectCoordinate` (latitude, longitude, constructionPhase)
- ✅ `ProjectIndicator` (groupName, indicatorName, value, sourceType MANUAL/AUTO, autoSourceField) + enum `IndicatorSource`
- ✅ `FundingSource`, `Task` — перенесены из Модуля 2
- ✅ Миграции: `20260409120000_add_info_module_models`, `20260410210000_extend_sed_module`

---

## МОДУЛЬ 4 — Управление проектом ✅

> **Аналог:** ЦУС → Модуль «Управление проектом»
> **Статус:** ✅ Завершён (Шаги 1–9)

### Вкладка «Контракты»
- ✅ Список договоров с фильтром по категориям (левая панель)
- ✅ Категории договоров (ContractCategory)
- ✅ Вкладка «Платежи» в карточке договора (план / факт)
- ✅ Страница перенесена в `/objects/[objectId]/project-management/contracts`, старый URL `/contracts` → redirect
- ✅ Авторасчёт НДС: `vatAmount = totalAmount * vatRate / 100` при создании/обновлении контракта (POST/PUT API)

### Вкладка «Документы» (файловое хранилище)
- ✅ Документарий с категориями (переиспользуется)
- ✅ Папочная структура с доступом по ролям
- ✅ Drag-and-drop загрузка файлов (react-dropzone + presigned S3 URL)
- ✅ Версионирование файлов (история версий в Sheet)
- ✅ QR-коды на документах для проверки актуальности версии на площадке
- ✅ Публичная страница /docs/verify/[token] (без авторизации)
- ✅ Скачивание отдельного файла (presigned URL)
- ✅ ZIP-архив папки (archiver + S3 streaming)
- ✅ 7 папок по умолчанию создаются автоматически при создании проекта
- ✅ Сводный реестр документов объекта — все модули (ИД, КС-2/КС-3, Акты СК, ПИР, СЭД, файлы) в единой таблице; агрегационный API `/api/projects/[pid]/all-documents` с фильтром по категории и пагинацией; двухколоночный layout: левая панель 6 категорий + TanStack Table с колонками ☐/📎/Статус/Тип/Номер/Дата/Наименование/Версия/Замечания; диалог создания с предзаполнением типа по активной категории

### Вкладка «Мероприятия»
- ✅ Реестр событий (совещания, проверки ГСН, приёмки, аудиты, сдача-приёмка)
- ✅ Список с фильтрами по типу / статусу / диапазону дат
- ✅ Календарный вид (react-big-calendar)
- ✅ Создание мероприятия с привязкой к договору и участниками
- ✅ Загрузка протокола мероприятия (S3)
- ✅ Уведомление участников за N дней (BullMQ delayed job)

### Вкладка «Аналитика (Контракты)»
- ✅ Суммы договоров по категориям (круговая диаграмма Recharts)
- ✅ Плановые платежи по месяцам (столбчатая диаграмма)
- ✅ План vs Факт по месяцам (двойная диаграмма, тумблер накопительный/раздельный)
- ✅ Таблица статусов договоров (количество и суммы)
- ✅ Просроченные акты КС-2 (виджет-алерт)
- ✅ Фильтр по году

### Вкладка «Перечень мероприятий» ✅
- ✅ Двухколоночный layout: сайдбар категорий слева + реестр документов справа (URL `/project-management/activities`)
- ✅ ActivityCategory — настраиваемые категории с самоссылкой parentId, isSystem/isHidden
- ✅ ActivityDocument — реестр: Статус / Тип / Номер / Дата / Наименование / Версия / Активные замечания
- ✅ 5 системных категорий (seed): Заключение договоров, Дорожная карта, Подготовка к строительству, Разрешительная документация, Приёмка объекта
- ✅ ConfigureCategoriesDialog — чекбоксы вкл/выкл системных категорий в сайдбаре
- ✅ CreateActivityDocumentDialog — создание с предзаполненной категорией (или Select если «Все»)
- ✅ API CRUD: `/api/projects/[projectId]/activity-categories` + `/configure` + `/activity-documents`
- ✅ Миграция: `20260411010000_add_activity_models`

### Вкладка «Планировщик проекта» ✅
- ✅ Иерархический планировщик мероприятий (дерево задач с неограниченной вложенностью)
- ✅ Drag-and-drop для изменения порядка задач (@dnd-kit/sortable)
- ✅ Раскрытие/скрытие ветвей дерева (expand/collapse)
- ✅ Контекстное меню: Редактировать | Добавить подзадачу | Удалить
- ✅ Версионирование УП (ProjectManagementVersion, isCurrent)
- ✅ Фильтрация по версии УП
- ✅ API CRUD: `/api/projects/[projectId]/planner-tasks`, `/api/projects/[projectId]/planner-versions`
- ✅ Reorder API: `/api/projects/[projectId]/planner-tasks/reorder`
- ✅ URL: `/objects/[objectId]/project-management/planner`

### Вкладка «Версии УП» ✅
- ✅ Таблица версий УП: Название | Актуальная (✓/—) | Дата создания | Количество задач
- ✅ Контекстное меню строки: Сделать актуальной | Редактировать | Удалить с подтверждением
- ✅ Диалог создания: название + чекбокс «Актуальная» с предупреждением о смене
- ✅ Транзакция isCurrent: сброс у всех версий → установка у выбранной (переиспользует PATCH API)
- ✅ Удаление актуальной версии заблокировано (кнопка disabled)
- ✅ URL: `/objects/[objectId]/project-management/versions`

### Вкладка «Аналитика (контракты)» ✅
- ✅ Фильтр по периоду (DateRange: два поля «с» / «по», дефолт — текущий год)
- ✅ Виджет 1 — «Стоимость по контрактам»: горизонтальный BarChart только по ACTIVE-контрактам, отсортирован по убыванию суммы
- ✅ Виджет 2 — «Плановые платежи»: LineChart с двумя линиями — помесячно и накопительным итогом
- ✅ Виджет 3 — «Фактические vs Плановые»: совмещённый LineChart двух накопительных линий (план/факт) с объединённой осью X
- ✅ Виджет 4 — «Статусы контрактов»: PieChart donut (Подписан / Не подписан / Расторгнут), количество + процент
- ✅ API: `GET /api/projects/[projectId]/contract-analytics?from=&to=` → `{ costByContract, plannedPayments, factPayments, statusDistribution }`
- ✅ URL: `/objects/[objectId]/project-management/analytics`

**База данных (Модуль 4)**
- ✅ `ProjectDocument` (projectId, folderId, name, version, s3Key, qrToken)
- ✅ `ProjectDocumentVersion` (история версий)
- ✅ `ProjectFolder` (дерево папок через parentId)
- ✅ `ProjectEvent` (типы: MEETING, GSN_INSPECTION, ACCEPTANCE, AUDIT, COMMISSIONING, OTHER)
- ✅ `ContractPayment` (PLAN / FACT)
- ✅ `ContractCategory`
- ✅ **Расширение карточки договора (ЦУС):** новые поля `Contract` (executionStatus, vatRate/vatAmount, plannedStart/End, factStart/End, parentContractId / «ContractLinks»); новые поля `ContractCategory` (includeInPaymentWidget, executionStage); новые поля `ContractPayment` (limitYear, limitAmount); `ChangeOrder.changeType`; 6 новых моделей: `ContractObligation`, `ContractAdvance`, `ContractExecution`, `ContractGuarantee`, `ContractDetailInfo`, `ContractFinancialTable` (миграция `20260411000000_extend_contract_card`)
- ✅ Карточка договора: сводная строка (документы, платежи) + вкладки «Обязательства», «Связанные контракты», «Подробная информация», «Локальные сметные расчёты»
- ✅ `ActivityCategory` (projectId, isSystem, isHidden, parentId — иерархия, @@unique[projectId+name])
- ✅ `ActivityDocument` (categoryId, projectId, authorId, status, version, activeIssuesCount)
- ✅ `Task` расширена: `parentTaskId`, `order`, `level`, `versionId` + самоссылка "TaskHierarchy"
- ✅ `ProjectManagementVersion` (id, name, isCurrent, projectId) — `@@map("project_management_versions")`
- ✅ Миграция: `20260411020000_add_planner_hierarchy`

---

## МОДУЛЬ 5 — ПИР (Проектно-изыскательские работы) ✅

> **Аналог:** ЦУС → Модуль «ПИР»
> **Ориентир:** 2 недели (выполнено)

- ✅ Задание на проектирование (разделы, НТД, 95 параметров, согласование через ApprovalRoute)
- ✅ Задание на изыскания (15 параметров, аналогично ЗП)
- ✅ Реестр документов ПД: шифр, наименование, раздел, версия, категория
- ✅ QR-коды на страницах чертежей (публичная верификация /docs/verify/[token])
- ✅ Привязка документа ПИР к актам ИД (чертёж → АОСР, двусторонняя)
- ✅ Прохождение экспертизы: статус, замечания, дата
- ✅ Реестры ПИР с экспертизой (отправитель, получатель, документы)
- ✅ Акт закрытия ПИР с позициями, статусной машиной и workflow согласования
- ✅ Замечания к заданиям и документам (создание, ответ, принятие, статус)
- ✅ Аналитика ПИР (6 виджетов Recharts: статусы, типы, авторы, замечания)
- ✅ loading.tsx + error.tsx для всех 11 страниц модуля
- ✅ CRUD API шаблонов маршрутов согласования (`/api/organizations/[oid]/approval-templates`) + применение к сущности (POST `.../apply`)
- ✅ Бэкенд decide-роуты для ПИР-сущностей (POST `.../workflow/decide`) и stop-роуты (DELETE `.../workflow`) для DesignTask, DesignDocument, PIRClosureAct
- ✅ Вкладка «Согласование» (`PIRApprovalWidget`): выбор шаблона (`ApprovalTemplateSelector`), создание шаблона с уровнями (`CreateApprovalTemplateDialog`), таймлайн с кнопками «Согласовать» / «Отклонить» / «История» / «Скачать ▾» / «Остановить» (`ApprovalTimeline`) — переиспользуется в DesignTask (ЗП/ЗИ), DesignDocument, PIRClosureAct
- ✅ Soft-delete / restore / физическое удаление документов ПИР с очисткой S3 (`soft-delete`, `restore`, `permanent`)
- ✅ CRUD API штампов PDF (`/api/projects/[pid]/stamps`): создание, перемещение (`move`), изменение размера (`resize`), удаление
- ✅ CRUD справочника титулов штампов (`/api/organizations/[oid]/stamp-titles`)
- ✅ `create-version` — новая версия документа с наследованием замечаний (`DesignDocComment`)
- ✅ `create-copy` — независимая копия документа без наследования замечаний
- ✅ GET design-docs: параметр `?includeDeleted=true` (только для роли ADMIN)
- ✅ Печать Задания на проектирование (ЗП) — PDF Handlebars (`templates/pir/design-task.hbs`): блоки УТВЕРЖДАЮ/СОГЛАСОВАНО + таблица параметров; `POST /api/projects/[projectId]/design-tasks/[tid]/print`
- ✅ Печать Задания на изыскания (ЗИИ) — тот же шаблон, `isSurveyTask=true`, заголовок «ЗАДАНИЕ НА ИЗЫСКАНИЯ»
- ✅ Печать Акта закрытия ПИР — PDF Handlebars (`templates/pir/closure-act.hbs`): реквизиты, таблица позиций, итого, подписи; `POST /api/projects/[projectId]/pir-closure/[aid]/print`; заглушка активирована
- ✅ Кнопка «Документооборот ▾» в карточке документа ПИР → «Создать в СЭД»: `POST /api/projects/[projectId]/design-docs/[did]/send-to-sed` создаёт `SEDDocument` (тип OTHER, внутренний) + `SEDLink(entityType=DESIGN_DOC)` → редирект на новый СЭД-документ

**База данных (Модуль 5)**
- ✅ `DesignTask`, `DesignTaskParam`, `DesignTaskComment`
- ✅ `DesignDocument` (+`deletedAt`, +`sentForExpertise`, +`reviewer*`, +`reviewerComment`), `DesignDocComment` (+`plannedResolutionDate`, +`suggestion`, +`watchers[]`)
- ✅ `PIRRegistry`, `PIRRegistryItem`
- ✅ `PIRClosureAct`, `PIRClosureItem`
- ✅ `ApprovalTemplate`, `ApprovalTemplateLevel` — переиспользуемые шаблоны маршрутов согласования с уровнями
- ✅ `DesignDocChange` — журнал версий и изменений документа ПИР
- ✅ `PdfStamp` — размещение штампов на PDF-файлах (`entityType`/`entityId`, позиция, размер)
- ✅ `StampTitle` — справочник заголовков штампов (per-организация, Handlebars-шаблон)
- ✅ `PIRObjectTypeConfig`, `PIRCategoryConfig` — конфигурация категорий ПИР по типу объекта (@@unique projectId, parentCode для дерева)
- ✅ Миграция `20260411030000_extend_pir_module`
- ✅ UI штампов ПИР: `PdfStampManager` + `PdfQrManager` на каждом файле карточки документа; drag-and-drop позиционирование в `PdfStampPreview`; `AddStampDialog` (выбор/создание `StampTitle`, произвольный текст, страница); `AddQrDialog` с выбором шаблона (Только QR / QR+название / QR+дата) и click-позиционированием на PDF
- ✅ Улучшенный UI штампов ПИР: hover-панель с кнопками «Редактировать / Передвинуть / Изменить размер»; режим явного drag и 4-угловые ручки ресайза; endpoints move/resize переведены с POST на PATCH; фоновая перегенерация PDF с наложенным штампом через `overlayTextStamp` → S3 (PATCH `stamps/[sid]/apply`)
- ✅ `PIRObjectTypeConfig` + `PIRCategoryConfig` — настройка разделов ПД/РД по типу объекта строительства (ПП РФ №87)
- ✅ `ConfigurePIRCategoriesDialog` — 2-шаговый диалог: выбор типа объекта → чекбоксы включения разделов
- ✅ Дерево категорий в левой панели «Документация» (`PIRCategoryTree`): навигация по разделам, кнопка «+» для пользовательских разделов
- ✅ API: `POST /api/projects/[pid]/pir-config` (создать конфиг + предустановки ПП РФ №87), `GET/PATCH /api/projects/[pid]/pir-config/categories`
- ✅ Миграция `20260411040000_add_pir_object_type_config`
- ✅ Вкладка «Изменения» в карточке документа ПИР (`DesignDocChangelog`): таблица Версия/Описание/Автор/Дата, ручное добавление записей через диалог; API `GET/POST /api/projects/[projectId]/design-docs/[did]/changes`
- ✅ Вкладка «ТИМ» в карточке документа ПИР (`DesignDocTimTab`): связанные BIM-элементы через `BimElementLink(entityType=DESIGN_DOC)`, группировка по модели, placeholder при отсутствии связей; API `GET /api/projects/[projectId]/design-docs/[did]/tim-links`; счётчик в табе
- ✅ Вкладка «Подписание» в карточке документа ПИР: заглушка ЭЦП (КриптоПро CSP), индикатор статуса `APPROVED`
- ✅ Шапка карточки ПИР-документа по ЦУС стр. 106: строка 1 «Документ ПИР № {number} от {date}», строка 2 «Версия №{v} | {status} | Внешний № — | Согласование {approvalStatus} | Подписание {signStatus}»; 7 вкладок с динамическими счётчиками
- ✅ Лист согласования ПИР (PDF): шаблон `templates/pir/approval-sheet.hbs` (колонки Уровень/ФИО/Организация/Должность/Статус/Дата/Комментарий), генератор `generatePIRApprovalSheetPdf()` в `pir-pdf-generator.ts`, кнопка «Скачать ▾» во вкладке «Согласование» для DesignTask и DesignDocument; `POST /api/projects/[projectId]/design-tasks/[tid]/approval-sheet` + `POST /api/projects/[projectId]/design-docs/[did]/approval-sheet`; организации подтягиваются из ContractParticipant по роли; работает даже без активного маршрута
- ✅ Лист подписания ПИР (шаблон-заглушка): `templates/pir/signing-sheet.hbs` (таблица с пустыми полями подписей + уведомление о КриптоПро CSP), `generatePIRSigningSheetPdf()`, `POST /api/projects/[projectId]/design-docs/[did]/signing-sheet`; кнопка «Скачать ▾» во вкладке «Подписание» карточки документа ПИР

---

## МОДУЛЬ 6 — Сметы

> **Аналог:** ЦУС → Модуль «Сметы»
> **Ориентир:** 3–4 недели

### Импорт (готово ✅)
- ✅ XML Гранд-Сметы, Excel, PDF
- ✅ Предпросмотр, автопривязка к КСИ
- ⬜ Прямой импорт АРПС без AI

### Работа со сметой
- ✅ Автоподстановка объёмов в АОСР и КС-2
- ✅ API глав сметы: GET (дерево с позициями), POST (создание с level/parentId/order), PATCH, DELETE (каскадно + пересчёт итогов)
- ✅ API позиций сметы: GET (пагинация), POST (авто totalPrice), PATCH (пересчёт totalPrice + итогов), DELETE (soft delete + пересчёт)
- ✅ API перенумерации позиций: POST renumber (последовательная нумерация по sortOrder)
- ✅ Каскадный пересчёт итогов: позиция → глава → версия (recalculateVersion)
- ✅ API дополнительных затрат: GET/POST/PATCH/DELETE (общие ДЗ объекта + индивидуальные по сметам, привязка к главам/сметам, проверка VAT level)
- ✅ API коэффициентов пересчёта: GET/POST/PATCH/DELETE (по версии сметы, включение/отключение через isEnabled)
- ✅ UI дополнительных затрат: AdditionalCostsDialog (таблица общих ДЗ объекта), AddAdditionalCostDialog (создание/редактирование с вкладками Основное/Значения), CoefficientListDialog (управление коэффициентами с включением/отключением/удалением), интеграция в EstimateListView и EstimateTreeToolbar ✅ (2026-04-12)
- ✅ Иерархический UI: EstimateTreeView на TanStack Table с expand/collapse разделов, тулбар (статус/имя/формат, меню Индексы/Коэффициенты/ДЗ/Виды работ/Перенумерация, кнопки Редактирование/Экспорт/Печать/Пересчёт/История), режим редактирования (EDITING→RECALCULATING→OK), диалог позиции с вкладками (Основное/Цены/Коэффициенты/Округления), диалог истории с пагинацией ✅ (2026-04-12)
- ⬜ Интеграция с ФГИС ЦС (актуальные индексы цен)
- ✅ Сравнение версий смет: расширенный API с режимами default/volumes/cost/contract, алгоритм сопоставления по sortOrder+code → importItemId → name+unit ✅ (2026-04-12)
- ✅ UI сравнения смет: RadioGroup для 4 форматов (по умолчанию/объёмы/стоимость/контракт), кнопка печати, таблицы сопоставительных ведомостей по форматам (CompareVolumesTable, CompareCostTable, CompareContractSummary), KPI-карточки ✅ (2026-04-12)
- ✅ UI сметы контракта: иерархическая таблица (разделы + позиции, 9 колонок: № п.п/Номер сметы/Обоснование/Наименование/Ед.изм./Кол-во/Цена без НДС/Стоимость/СР), тулбар (Создать раздел/Раздел из справочника/Экспорт в шаблон/Скачать/Пересчитать/Параметры), контекстное меню позиций (Выбрать расчет/Добавить позицию/Редактировать), диалог создания сметы контракта (Наименование/Период/Глава), диалог привязки расчёта (выбор локальных смет, radio «Для объёма»/«Для ед. изм.», авторасчёт цены за единицу) ✅ (2026-04-12)
- ✅ Загрузка корректировочных смет: POST load-correction (gsfx/gge/xml → CORRECTIVE версия с parentVersionId) ✅ (2026-04-12)
- ✅ Перезагрузка сметы из исходного файла: POST reload (откат к sourceImport, пересоздание глав/позиций) ✅ (2026-04-12)
- ✅ Экспорт сметы в Excel-шаблон ЦУС: GET export-template (ExcelJS, 2 листа: Смета + info) ✅ (2026-04-12)
- ✅ История изменений сметы: GET history (EstimateChangeLog, пагинация, audit trail) ✅ (2026-04-12)
- ✅ UI модуля Сметы: layout с 4 вкладками (Сметы, Сравнение смет, Ведомости, Позиции), суммарная строка (базовые/текущие без ДЗ/текущие цены), панель действий с dropdown (Импорт, Excel-шаблон, общие ДЗ, Действия), двухколоночный layout (категории + реестр) ✅ (2026-04-12)
- ✅ UI реестра смет: дерево категорий (CRUD, счётчик, иерархия), TanStack Table (чекбокс, статус, файл, глава, период, контракт, заказчик, исполнитель, категория), информационная панель (реквизиты + корректировки), контекстное меню (правый клик + ⋮) ✅ (2026-04-12)

### Полный сметный модуль (финальная фаза)
- ⬜ Справочник ГЭСН-2022, КСР
- ⬜ Составление локальной сметы с нормами и ресурсами
- ⬜ Экспорт в XML (Гранд-Смета), xlsx, PDF

**База данных (Модуль 6)**
- ✅ `EstimateImportItem` (из Фаз 3.5)
- ✅ `EstimateChapter`, `EstimateVersion` (версионирование, иерархия глав)
- ✅ `EstimateCategory` — иерархическая группировка смет по папкам (self-ref дерево)
- ✅ `EstimateVersion.status` (OK/EDITING/RECALCULATING/ERROR), `categoryId`
- ✅ `EstimateItem`: `isCustomerResource`, `ssrWorkType`, `isExcluded`
- ✅ `EstimateAdditionalCost` + `EstimateAdditionalCostChapter` + `EstimateAdditionalCostEstimate` — доп. затраты (НР, СП, НДС, зимнее удорожание и т.д.)
- ✅ `EstimateCoefficient` — коэффициенты пересчёта сметы
- ✅ `EstimateChangeLog` — лог изменений версии сметы (action, field, oldValue/newValue, userId) ✅ (2026-04-12)
- ⬜ `GesnNorm`, `KsrResource`, `FgisPrice` (финальная фаза)

---

## МОДУЛЬ 7 — ГПР (График производства работ) 🔄

> **Аналог:** ЦУС → Модуль «ГПР»
> **Статус:** ✅ Завершён (Шаги 1–12) + 🔄 Рефакторинг вкладки «График» (6 под-вкладок)

- ✅ Диаграмма Ганта (gantt-task-react, drag-and-drop, каскад FS)
- ✅ Иерархия: Стадия → Версия → Задача (родительская → дочерняя)
- ✅ Три линии: План / Факт / Прогноз; критический путь
- ✅ Зависимости (FS, SS, FF, SF), drag-and-drop
- ✅ Версионирование: Базовая / Актуальная / Директивная
- ✅ Сравнение версий с подсветкой изменений
- ✅ Суточный график (бригады, техника)
- ✅ План освоения: помесячный, автосвязь с КС-2 (export Excel)
- ✅ Раздел «ИД и СК»: индикатор готовности ИД по позиции ГПР
- ✅ Стадии реализации (CRUD, drag-and-drop порядок)
- ✅ Импорт из сметы (EstimateVersion → GanttTask)
- ✅ Импорт Primavera P6 (XER) / MS Project (XML) / Excel-шаблон ГПР
- ✅ Экспорт ГПР в Excel (с зависимостями) и PDF
- ✅ Аналитика ГПР: S-кривая, топ задержек, готовность ИД
- ✅ EVM-аналитика (EV, AC, PV, BAC, CPI, SPI и др.)
- ✅ Делегирование работ (delegate, delegate-and-merge, sync)
- ✅ URL /objects/[id]/gpr/ + layout с 8 вкладками
- ✅ CRUD производственных календарей (GET/POST/PATCH/DELETE + from-template)
- ✅ Журнал изменений ГПР (changelog endpoint + `logGanttChange` helper, аудит PATCH/DELETE задач)
- ✅ Разделение задачи на захватки (split: SEQUENTIAL/PARALLEL × COUNT/DURATION)
- ✅ Настройка видимости колонок (`GanttVersion.columnSettings`)
- ✅ Панель EVM-показателей (ЦУС): DatePicker, проценты (план/факт/прогноз/отклонение), абсолютные EVM (EV/AC/PV/BAC/SAC/TAC/AT), отклонения (CV/SV/TV), индексы CPI/SPI с цветовой индикацией
- ✅ Настройки S-кривой: период детализации (дни/недели/месяцы/кварталы/годы), единицы (рубли/%), переключатели линий (PV/EV/AC/План%/Факт%)
- ✅ Диалог «История изменений» ГПР (Sheet + фильтры по дате/задаче + пагинация, кнопка 🕐 в toolbar)

### Вкладка «График» — 6 под-вкладок (ЦУС) 🔄

- ✅ Рефакторинг `GanttScheduleView`: боковая панель (версии/стадии) + 6 под-вкладок
- ✅ `GanttCoordinationView` — таблица ИСР (13 колонок, inline-редактирование дат, сводная строка)
- ✅ `GanttPlanFactView` — отклонения план/факт с прогресс-барами
- ✅ `GanttClosureView` — закрытие работ (объём, факт, остаток, % закрытия)
- ✅ `GanttIdSkView` — ИД и СК по задачам ГПР (открывает GanttExecDocsSheet)
- ✅ `GanttDelegationView` — делегированные задачи + кнопка «Перенести данные готовности»
- ✅ `GanttScheduleToolbar` — тулбар «Действия» (7 групп: Делегирование / Пересчёт / Сметы / Стройконтроль / Импорт / Экспорт / Календарь версии); кнопки Импорт/Экспорт активны
- ✅ `GanttImportDialog` — диалог импорта ГПР из файла (MS Excel, Primavera P6, MS Project, Spider Project placeholder); dropzone + шаблон + radio НДС/без НДС; поддержка замены данных (replace) для непустых версий
- ✅ Экспорт ГПР: «Выгрузить в Excel» / «Excel с зависимостями» / «PDF» через тулбар → GET /export?format=
- ✅ Генератор Excel-шаблона ГПР (`gpr-excel-template.ts`) + API `GET /gantt-versions/gpr-template`
- ✅ Empty-state для пустой версии ГПР: 3 кнопки (+ Добавить запись, Импортировать ГПР, Заполнить из смет)
- ✅ `GanttTaskEditDialog` — расширенная карточка редактирования задачи ГПР (17 полей: объём/ед., суммы/НДС, вес, чел./маш.-часы, крайний срок, контракт задачи, вид работ, тип стоимости, основание, характер распределения, тип расчёта, комментарий, вложения S3); вкладки «Основные» и «Дополнительно»
- ✅ Контекстное меню ИСР (⋮): Структура (добавить дочерний / добавить ниже / сдвинуть выше/ниже) / Изолировать / Прикрепить файл / Скопировать / Редактировать / Сделать вехой / Календарь / Удалить
- ✅ Обогащённые индикаторы ИСР: С/М/О/П (тип стоимости), 🏛 (основание), ♦ (веха), ⚠ (критический путь), 📋 (контракт задачи), 📅 (кастомный календарь)
- ✅ `calcType String?` в `GanttTask` — тип расчёта прогресса (DEFAULT/VOLUME/AMOUNT/MAN_HOURS/MACHINE_HOURS/LABOR)
- ✅ API: `POST/DELETE /gantt-versions/[versionId]/tasks/[taskId]/attachments` — загрузка/удаление вложений в Timeweb S3
- ✅ Предпросмотр изменений при загрузке корректировочной сметы в ГПР (`estimate-changes-preview` API + `EstimateChangesPreviewDialog` + экспорт Excel + режим замены `replace` в `import-from-estimate`)
- ⬜ `factVolume Float?` в `GanttTask` — нужна Prisma-миграция (заглушка «—» в Координации и Закрытии)
- ⬜ КС-2 join в `/tasks` endpoint — для колонки «Подтверждённый объём (из КС-2)»
- ⬜ `delegatedFromOrg` в `/delegated-tasks` API — для колонки «Делегировано от»
- ✅ `GanttGroupingMenu` — кнопка (≡) группировки ИСР: Единицы (volumeUnit) / Вид работ (workType) / Тип стоимости (costType); виртуальные строки-заголовки групп; клиентская группировка без API; future: Исполнители / Ответственные / Бригады (требуют новых полей GanttTask)
- ✅ Режим множественного редактирования (☑): чекбоксы + «Выбрать все» в шапке; floating toolbar `GanttMultiSelectToolbar` — Переместить / Объединить / Назначить / ↑↓←→ / Выбрано: N / ✕; `GanttMoveDialog` — выбор целевого раздела; `useGanttCoordinationState` — управление выбором
- ✅ Изоляция отмеченных (👁/EyeOff): скрыть всё кроме выбранных задач + их предков; `isolatedTaskIds: Set<string>` в `useGanttCoordinationState`; баннер «Показать все»; «Изолировать» из меню строки добавляет задачу в selectedTaskIds
- ✅ Контекстное меню иконки раздела (📁/📂, правый клик): `GanttContextMenu` — Раскрыть все / Свернуть все / До уровня N (1..5); `collapsedTaskIds: Set<string>` + `isTaskVisible()` в `useGanttCoordinationState`

**База данных (Модуль 7)**
- ✅ `GanttTask`, `GanttVersion`, `GanttDependency`, `GanttDailyPlan`, `GanttStage`, `GanttTaskExecDoc`
- ✅ `GanttCalendar`, `GanttChangeLog` — производственные календари и журнал изменений
- ✅ Делегирование версий между организациями (`delegatedFromOrg`, `delegatedToOrg`, `DelegationTree`)
- ✅ Настройки версии: метод расчёта, блокировки, округление, доступ, видимость колонок (`columnSettings Json?`)
- ✅ `GanttVersionEditDialog` — расширенный диалог создания/редактирования версии (4 вкладки: Основные / Участники / Настройки / Объединение версий; inline-создание стадии; combobox контракта с авто-заполнением орг; маппинг актуальности Черновик/Актуальная/Архив; MultiSelect орг для доступа; MultiSelect версий для объединения)
- ✅ `GanttScheduleSidebar` — боковая панель инструментов: кнопки «Из директивной» и «Из другой версии» включены; «Настройки версии» открывает `GanttVersionEditDialog`
- ✅ `fill-from-version` API (`POST /gantt-versions/[versionId]/fill-from-version`) — копирование задач из версии-источника с восстановлением иерархии через 2-pass (idMap)
- ✅ `GanttColumnSettingsSheet` — Sheet «Настроить колонки» (⋮ → пункт меню); 16 колонок с checkboxes; `PATCH /column-settings`; синхронизация с `GanttVersion.columnSettings`
- ✅ `gantt-orgs` API (`GET /api/projects/[projectId]/gantt-orgs`) — список организаций из участников контрактов объекта + собственная организация (для Combobox в диалоге версии)
- ✅ Расширенные поля задач: человеко-часы, машино-часы, НДС, вес, тип стоимости, тип расчёта, календарь, вложения S3

---

## МОДУЛЬ 8 — Ресурсы (Склад, Закупки, Логистика) ✅

> **Аналог:** ЦУС → Модуль «Ресурсы»
> **Статус:** ✅ Завершён (Шаги 1–9)

### Учёт материалов ✅
- ✅ Реестр материалов, остатки, сертификаты
- ✅ Партионный учёт (ЖВК + АВК)
- ✅ Предупреждение при отсутствии сертификата

### Планирование и закупки ✅
- ✅ Планирование потребности из ВОР + ГПР (вкладка «Планирование», GprMaterialsPanel)
- ✅ Создание ЛРВ из ГПР — многошаговый Wizard (LrvWizard)
- ✅ Разделы ресурсов ГПР в PlanningView: Машины и механизмы (machineHours), Работы (задачи ГПР level>0), Рабочая сила и кадры (manHours) — readonly таблицы с фильтрами версии/периода, кнопка «Экспорт в Excel» (заглушка); API `GET /api/projects/[id]/gpr-resources?resourceType=machines|works|labor` (2026-04-13)
- ✅ Заявки на материал (DRAFT → SUBMITTED → APPROVED → IN_PROGRESS → DELIVERED)
- ✅ Карточка заявки с позициями, inline-редактирование
- ✅ Заказы поставщику (DRAFT → SENT → CONFIRMED → DELIVERED → COMPLETED)
- ✅ Создание заказа из заявки (create-order)
- ✅ Три типа документов: «Заказ поставщику» / «Заявка на склад» / «Запрос поставщику» (`SupplierOrderType` enum, `?section=` URL-синхронизация, счётчики по разделам, единая таблица для всех типов)
- ✅ Справочник номенклатуры (MaterialNomenclature, API на уровне организации)
- ✅ Система комментариев к заявкам (MaterialRequestComment): вложенные ответы (parentId), редактирование/удаление своих, вкладка «Ответы» в карточке заявки с badge счётчика
- ✅ **Расширение карточки заказа до ЦУС (2026-04-13)**: 6 вкладок (Документ, Товары, Согласование, Подписание, Элементы ТИМ, Связанные документы); OrgSearchInput для Исполнителя и Заказчика; Склад-Select; поля: Внешний номер, Условия поставки (EXW/FOB/CIF/DAP), Тип контракта, даты готовности (4 поля), Готовность через, Объект строительства; в таблице товаров: Скидка %, Сумма без НДС, Ставка НДС, Сумма НДС, Сумма с НДС, Вес, Объём, Основание + итоговая строка; нижняя панель: Сменить статус, Заполнить из, Создать на основании (6 типов), Печать, Действия (Удалить, Копировать); маршрут согласования через ApprovalRoute; миграция `expand_supplier_order`
- ✅ **Статусы позиций заявки (2026-04-13)**: настраиваемый справочник `MaterialRequestItemStatus` на уровне организации (GET/POST/PATCH/DELETE `/api/organizations/[orgId]/request-item-statuses`); Select с inline-созданием (`ItemStatusSelect.tsx`) в таблице позиций карточки заявки (ЦУС стр. 215)
- ✅ **Индикатор необработанной заявки (2026-04-13)**: колонка «Обработана» (✅/⚠️) в реестре заявок — заявка необработана если хотя бы одна позиция без статуса; batch-запрос без N+1 (ЦУС стр. 215)
- ✅ **Перенос позиций в новую заявку (2026-04-13)**: чекбоксы в таблице позиций + кнопка «Перенести в новую заявку» + `POST /transfer-items`; новая заявка DRAFT создаётся в транзакции (ЦУС стр. 215)
- ✅ **Workflow согласования заявок на материалы (2026-04-13)**: вкладка «Согласование» в карточке ЛРВ — ApprovalTimeline, кнопка «На согласование» (status → SUBMITTED + ApprovalRoute), принятие решений (APPROVED → status APPROVED / REJECTED → status DRAFT), уведомления менеджеру и ответственному; колонка «Согласование» в реестре заявок с фильтром (Не начато / В процессе / Согласовано / Отклонено)
- ⬜ Тендерный реестр: несколько предложений поставщиков (SupplierOffer — не реализован)

### Склад ✅
- ✅ Склад объекта (Warehouse) с остатками по номенклатуре (WarehouseItem)
- ✅ Складские движения: поступление, отгрузка, перемещение, списание, возврат
- ✅ Проведение движений с обновлением остатков ($transaction)
- ✅ Автосвязь: поступление (RECEIPT) → создание MaterialBatch в ЖВК
- ✅ Таблица остатков по складу (WarehouseBalanceTable)
- ✅ **Расширение карточки MovementCard (2026-04-13)**: вкладка «Документ» — поля Грузоотправитель/Грузополучатель, Дата прибытия, Объект строительства, Тип НДС, Ставка НДС, Валюта; вкладка «Товары» — столбцы Скидка %, Сумма без НДС, Ставка НДС, Сумма НДС, Сумма с НДС, Основание, Комментарий, ГТД, Страна, Адрес получателя + итоговая строка; разделы «Приходный ордер» и «Расходный ордер» в левой панели (RECEIPT_ORDER/EXPENSE_ORDER — проведение аналогично RECEIPT/WRITEOFF); нижняя панель: Заполнить из, Создать на основании (Возврат/Списание/Приходный ордер/Расходный ордер активны, остальные — заглушки), Печать, Действия (Удалить, Копировать); миграция `extend_movement_card`
- ✅ **Цепочка «Создать на основании» (2026-04-13)**: единый API `POST /warehouse-movements/create-from` (sourceType: SUPPLIER_ORDER | WAREHOUSE_MOVEMENT); из заказа поставщику — 6 типов: RECEIPT (через диалог выбора склада) / SHIPMENT / TRANSFER / RECEIPT_ORDER / EXPENSE_ORDER / WRITEOFF (авто-заполнение склада и контрагентов из реквизитов заказа); из поступления (MovementCard) — 4 типа: RETURN / WRITEOFF / RECEIPT_ORDER / EXPENSE_ORDER (уже работали через `create-based-on`); редирект на вкладку «Склад» после создания документа
- ⬜ Автосвязь: списание → черновик АОСР (материал подставлен) — не реализовано

### UI ✅
- ✅ Layout с 4 вкладками: Планирование / Заявки / Закупки и логистика / Склад
- ✅ 30 компонентов: PlanningView, RequestsView, ProcurementView, WarehouseView и др.
- ✅ Хуки: usePlanning, useRequestCard, useProcurement, useWarehouse и др.
- ✅ Компонент ResourceAttachments (drag-and-drop загрузка файлов к заявкам и складским документам)
- ✅ Loading / Error boundaries

**База данных (Модуль 8)**
- ✅ `Material`, `MaterialDocument`, `MaterialBatch`, `MaterialWriteoff`
- ✅ `MaterialNomenclature`, `MaterialRequest`, `MaterialRequestItem`
- ✅ `SupplierOrder` (расширен: approvalRouteId, все поля ЦУС), `SupplierOrderItem` (расширен: discount, vatRate, vatAmount, weight, volume, basis)
- ✅ `Warehouse`, `WarehouseItem`, `WarehouseMovement`, `WarehouseMovementLine`
- ✅ `MaterialRequestComment` (комментарии к заявкам, parentId для вложенности, миграция `add_request_comments`)
- ✅ Прикрепление файлов к заявкам (MaterialRequest.attachmentS3Keys) и складским документам (WarehouseMovement.attachmentS3Keys) — вкладка «Файлы» в карточках, компонент ResourceAttachments, миграция `add_request_attachments`
- ⬜ `SupplierOffer` (тендерный реестр — не реализован)
- ✅ `MaterialRequestItemStatus` (id, name, color?, organizationId) — справочник статусов позиций; миграция `add_request_item_statuses`
- ✅ `MaterialRequestItem.statusId` FK → `MaterialRequestItemStatus` (замена `status String?`)
- ✅ Расширены поля моделей (миграция `module8_extend_fields`): `MaterialRequest` (+paymentDate, paymentAmount, type), `MaterialRequestItem` (+purchaseUnit, deliveryDate, paymentDeadline, costArticle, purchasePrice, purchaseQty), `SupplierOrder` (+externalNumber, expectedReadyDate, expectedArrivalDate, readinessCorrectionDate, underdeliveryDate, readinessThrough, deliveryConditions, contractType, constructionObject), `WarehouseMovement` (+consignor, consignee, vatType, vatRate, currency, externalNumber, attachmentS3Keys), `WarehouseMovementLine` (+vatAmount, totalWithVat, basis, gtd, country, comment); enum `WarehouseMovementType` +RECEIPT_ORDER, EXPENSE_ORDER

---

## МОДУЛЬ 9 — Журналы ✅

> **Аналог:** ЦУС → Модуль «Журналы»
> **Статус:** ✅ Завершён (Шаги 1–10)

### Ранее реализовано ✅
- ✅ ОЖР (КС-6а) — генерация, автозаполнение разделов 3 и 5 из АОСР
- ✅ ЖВК — записи, партии, привязки
- ✅ Замечания к записям, история статусов
- ✅ Маршрут согласования (ApprovalRoute)

### Специальные журналы ✅
- ✅ 31 тип журналов (SpecialJournalType): бетонные, сварочные, авторский надзор, монтажные, антикоррозионные, геодезические, земляные, свайные, кабельные, пожарная безопасность + 20 новых типов ЦУС (2026-04-14)
- ✅ Расширение SpecialJournalType: +20 типов журналов ЦУС — ОЖР (1026/пр, РД 11-05), входной контроль, стройконтроль (×2), вызовы СК, авторский надзор 2016, буровые, уход за бетоном, замоноличивание стыков, антикоррозия сварных, болтовые соединения, тарировка ключей, кабельнотрубный, кабельный по трассам, сварка трубопроводов, изоляционно-укладочные, нивелирование, ПБ-инструктажи
- ✅ JOURNAL_NORMATIVE_REFS — маппинг тип → нормативная ссылка (26 типов, Partial&lt;&gt;)
- ✅ CUSTOM скрыт из CreateJournalDialog (требование ЦУС: нельзя создавать произвольные журналы)
- ✅ Реестр журналов (JournalRegistry) с фильтрами по типу, статусу, договору
- ✅ Карточка журнала (JournalCard) + список записей (JournalEntryList)
- ✅ Создание журнала (CreateJournalDialog) с авто-нумерацией (ЖБР-001, ЖСР-001...)
- ✅ Создание записей (CreateEntryDialog) с общими и типо-специфичными полями
- ✅ Типо-специфичные поля для 3 типов: бетонные (ConcreteWorksFields), сварочные (WeldingWorksFields), авторский надзор (SupervisionFields)
- ✅ Детальная карточка записи (EntryDetailCard) с рендером JSON data по типу
- ✅ Замечания к записям (EntryRemarksSection): OPEN → IN_PROGRESS → RESOLVED
- ✅ Режим «хранения» (STORAGE) — запрет редактирования (ГОСТ Р 70108-2025)
- ✅ Автотриггер: запись ОЖР → черновик АОСР (journal-triggers.ts)
- ✅ Уведомление о дате освидетельствования за ≥3 рабочих дня (cron/inspection-reminder)
- ✅ Генерация PDF (4 шаблона: бетонные, сварочные, авторский надзор, универсальный)
- ✅ Layout с вкладками: Реестр журналов / ОЖР / ЖВК
- ✅ Loading / Error boundaries

### Не реализовано / на будущее
- ⬜ Типо-специфичные поля UI для 8 типов (монтажные, антикоррозионные, геодезические, земляные, свайные, кабельные, пожарная безопасность, произвольный) — используется generic-форма
- ⬜ Типо-специфичные PDF-шаблоны для 8 типов — используется generic-шаблон
- ✅ Полноценные страницы вкладок ОЖР и ЖВК: `OzrListView` (фильтр по форме 1026/пр и РД 11-05) + `JvkListView` (INPUT_CONTROL) с TanStack Table, фильтрами по типу/статусу, `CreateJournalDialog` с предвыбранным типом (prop `defaultType`)
- ✅ UI для запуска маршрута согласования журнала (ApprovalRoute связь есть в схеме, API нет)

**База данных (Модуль 9)**
- ✅ `SpecialJournal`, `SpecialJournalEntry`, `JournalEntryRemark`
- ✅ Enum: `SpecialJournalType` (31 значение), `JournalStatus`, `JournalEntryStatus`
- ✅ Связи: BuildingObject, Contract, User (5), ExecutionDoc, ApprovalRoute

### Исправления (2026-04-14)
- 🐛 Создана миграция `20260414000000_fix_estimate_categories` — таблица `estimate_categories` и FK `categoryId` в `estimate_versions` (P2021 при обращении к модулю смет)
- 🐛 Исправлены 4 вхождения `<SelectItem value="">` в `JournalRegistry`, `JournalEntryList`, `CreateJournalDialog` — заменены на сентинелы `"ALL"` / `"NONE"` (Radix UI v2.2.6 запрещает пустую строку)

### Добавлено (2026-04-14) — Расширение системы замечаний
- ✅ `JournalEntryRemark.entryId` nullable; новые поля: `title`, `journalId` → `SpecialJournal`, `issuedById` → User, `issuedAt`, `remediationDeadline`, `attachmentS3Keys`, `objectDescription`
- ✅ Новая модель `JournalRemarkReply` (id, title, text, remarkId, authorId, createdAt); миграция `extend_journal_remarks`
- ✅ API замечаний журнала: `GET/POST .../journals/[jid]/remarks`, `GET/POST .../remarks/[rid]/replies`, `POST .../remarks/[rid]/accept` (→ RESOLVED), `POST .../remarks/[rid]/return` (→ OPEN)
- ✅ `JournalRemarksTab.tsx` — таблица (№, Статус, Замечание, Кем выдано, Ответственный, Срок), Sheet-карточка с вкладками «Информация» / «Ответы», кнопки «Принять» / «Вернуть на доработку»
- ✅ Badge-счётчик замечаний на вкладке «Замечания» в `JournalCard`

### Добавлено (2026-04-14)
- ✅ Вкладка «Реквизиты» первой в `JournalCard`: Заказчик, Генподрядчик, Стройконтроль, Авторский надзор, Гос.надзор + даты начала/окончания работ
- ✅ Поля `SpecialJournal.requisites (Json?)`, `.startDate (DateTime?)`, `.endDate (DateTime?)` — миграция `20260414020000_add_journal_requisites`
- ✅ `PATCH /api/projects/[pid]/journals/[jid]` расширен: `requisites`, `startDate`, `endDate`
- ✅ `POST /api/projects/[pid]/journals/[jid]/fill-requisites` — автозаполнение из `ObjectOrganization` + `ObjectPerson` по ролям (regex-маппинг)
- ✅ `JournalRequisitesTab.tsx` + `useJournalRequisites.ts` — Select из участников объекта, Input[type=date]
- ✅ Система разделов ОЖР (`JournalSection`): 6 разделов (Р.1–Р.6) автосоздаются при открытии `OZR_1026PR`; `GET /sections` + `POST /sections/[sid]/fill` — автозаполнение Р.1/2 из `ContractParticipant`, Р.3 из `WorkRecord`+АОСР, Р.5 из подписанных ИД; вкладка «Разделы» в `JournalCard`; `SpecialJournalEntry.sectionId` — миграция `20260414030000_add_journal_sections`

### Добавлено (2026-04-14) — Workflow согласования журналов
- ✅ Кнопка «На согласование» в шапке `JournalCard` (только если журнал ACTIVE и нет активного маршрута)
- ✅ `GET/POST/DELETE /api/projects/[pid]/journals/[jid]/workflow` — получить/запустить/сбросить ApprovalRoute из участников контракта (роли: SUBCONTRACTOR→CONTRACTOR→DEVELOPER→SUPERVISION)
- ✅ `POST /api/projects/[pid]/journals/[jid]/workflow/decide` — принять решение APPROVED/REJECTED по текущему шагу + уведомления через `notifyApprovalEvent` (fire-and-forget)
- ✅ Вкладка «Согласование» в `JournalCard` — `JournalApprovalTab.tsx`: empty-state с кнопкой запуска, `ApprovalTimeline` при активном маршруте, badge-статус маршрута на триггере вкладки
- ✅ Заглушка «Подписать ЭЦП» (disabled Button) при `route.status === 'APPROVED'` — готова к подключению КриптоПро

### Добавлено (2026-04-14) — Связи записей и создание ИД из записи
- ✅ Enum `JournalLinkType` (OZR_TO_JVK | OZR_TO_AOSR | GENERIC); модель `JournalEntryLink` (sourceEntryId, targetEntryId, createdById, уникальность пары); миграция `20260414040000_add_journal_entry_links`
- ✅ API `GET/POST .../entries/[eid]/links` — список и создание связей между записями журналов разных типов
- ✅ API `POST .../entries/[eid]/create-exec-doc` — создание АОСР из записи ОЖР (авто-нумерация, привязка к договору журнала, обновление executionDocId)
- ✅ UI: контекстное меню записи (DropdownMenu с MoreHorizontal) — «Добавить связь → ЖВК» (`JournalEntryLinkDialog`), «Создать АОСР» (только для `OZR_1026PR`) → redirect к ИД
- ✅ Иконка `Link2` у записей со связями (`_count.sourceLinks + targetLinks > 0`)
- ✅ `JournalEntryLinkDialog.tsx` — двухшаговый выбор: журнал ЖВК → запись; мутации `createLinkMutation` и `createExecDocMutation` в `useJournalCard.ts`

### Добавлено (2026-04-14) — Вложения, bulk-delete, дублирование, контекстное меню записей
- ✅ `SpecialJournalEntry.attachmentS3Keys String[] @default([])` — миграция `20260414050000_add_journal_attachments`
- ✅ `POST/DELETE .../entries/[eid]/attachments` — загрузка и удаление вложений (Timeweb S3, паттерн: Gantt-вложения)
- ✅ `POST .../entries/[eid]/duplicate` — дублирование записи (новый номер, статус DRAFT, автор = текущий пользователь)
- ✅ `DELETE .../entries/bulk-delete` — массовое удаление (до 50 записей, только DRAFT, чистит S3)
- ✅ Одиночный DELETE обновлён: удаляет вложения из S3 перед удалением записи
- ✅ Drag-and-drop зона в `CreateEntryDialog` (react-dropzone, staged files → upload after create)
- ✅ Чекбоксы выбора в `JournalEntryList` + кнопка «Удалить выбранные (N)» + «выбрать все» header
- ✅ Расширенное контекстное меню записи: Информация, Редактировать, Замечания, Добавить связь, Создать АОСР, Дублировать, Скопировать ссылку, Удалить
- ✅ `journal-entry-columns.tsx` — `makeEntryColumns()` вынесен из `JournalEntryList.tsx` (правило <300 строк)
- ✅ `JournalCard.tsx` разбит: `JournalCardHeader.tsx` + `JournalEntriesTab.tsx` (правило >300 строк)
- ✅ `useJournalCard.ts` расширен: `selectedIds`, `deleteEntryMutation`, `duplicateMutation`, `bulkDeleteMutation`, `handleCreateEntry`

### Добавлено (2026-04-14) — Excel-импорт и Печать
- ✅ `GET .../journals/[jid]/excel-template` — скачать пустой xlsx-шаблон с колонками по типу журнала (8 общих + type-specific для бетонных/сварочных/авторского надзора)
- ✅ `POST .../journals/[jid]/import-excel[?preview=true]` — импорт записей из xlsx: `?preview=true` возвращает строки без записи в БД; без параметра — `createMany` с авто-нумерацией
- ✅ `POST .../journals/[jid]/print?format=pdf|doc|xls` — унифицированная генерация файла печати: PDF (Puppeteer), DOC (Handlebars→HTML с `Content-Type: application/msword`), XLS (ExcelJS)
- ✅ `src/lib/journal-excel-generator.ts` — `buildJournalColumns()`, `generateJournalTemplate()`, `generateJournalXls()`
- ✅ `ExcelImportDialog.tsx` — 3-шаговый диалог: скачать шаблон → дроп файла → предпросмотр строк → подтверждение импорта
- ✅ `JournalPrintMenu.tsx` — DropdownMenu «Печать» (.pdf / .doc / .xls) в шапке `JournalCard`
- ✅ `renderJournalHtml()` добавлен в `journal-pdf-generator.ts` (переиспользует кэш Handlebars-шаблонов для DOC)

### Добавлено (2026-04-14) — Компоненты полей для 8 типов журналов
- ✅ Компоненты полей (fields/) для 8 типов: `MountingWorksFields`, `AnticorrosionFields`, `GeodeticFields`, `EarthworksFields`, `PileDrivingFields`, `CableLayingFields`, `FireSafetyFields`, `DrillingWorksFields`
- ✅ `CreateEntryDialog` расширен: switch с 8 новыми case — type-specific поля отображаются при создании записи
- ✅ `EntryDetailCard` расширен: `DATA_FIELD_LABELS` с 8 новыми записями — русские label'ы в read-only просмотре

---

## МОДУЛЬ 10 — Исполнительная документация (ИД) ✅

> **Аналог:** ЦУС → Модуль «Исполнительная документация»
> **Статус:** ✅ Завершён (Шаги 1–10)

### Базовая функциональность ✅
- ✅ АОСР, ОЖР, АВК, АТГ — генерация, согласование, подписание
- ✅ Шаблоны .docx с редактируемыми полями
- ✅ КС-2 / КС-3 с автогенерацией позиций
- ✅ Реестр ИД, пакетный экспорт, штамп «Копия верна»

### Доработки (Шаги 1–10) ✅
- ✅ Визуализация дерева согласования с таймстампами (ApprovalTree)
- ✅ Штамп производства работ на PDF (координаты X/Y, типы) (StampPositioner + stamp-overlay.ts)
- ✅ QR-код на документе (привязка ИД ↔ чертежу ПД) (qr/route.ts + публичная верификация /docs/verify/[token])
- ✅ Аналитика ИД: % готовности по разделам ГПР (IdAnalyticsView, 4 виджета Recharts)
- ✅ **XML-экспорт по схемам Минстроя** — обязателен по ГОСТ Р 70108-2025 (aosr-xml-generator + ozr-xml-generator + пакетный экспорт)
- ✅ Закрывающая документация: финальный пакет ИД для сдачи объекта (IdClosureView + closure-packages API)
- ✅ Режим «хранения» ЭОЖР (запрет редактирования) (storage/route.ts + storageMode проверки в PATCH/DELETE)
- ✅ Классификация ИД на три группы по ГОСТ (IdCategory enum + id-classification.ts + автоклассификация)

**База данных (Модуль 10)**
- ✅ `IdCategory` enum (ACCOUNTING_JOURNAL, INSPECTION_ACT, OTHER_ID)
- ✅ `IdClosurePackage` (number, name, status, executionDocIds[], registryIds[], archiveDocIds[], s3Key)
- ✅ Расширение `ExecutionDoc`: qrToken, qrCodeS3Key, storageMode, storageModeAt, idCategory, stamp*, xml*

### Добавлено (2026-04-14) — Расширение типов ИД и вкладок
- ✅ `ExecutionDocType` расширен: +`GENERAL_DOCUMENT` (общий документ), +`KS_6A` (КС-6а), +`KS_11` (Акт приёмки КС-11), +`KS_14` (Акт приёмки КС-14)
- ✅ Вкладки `ObjectIdModule` переработаны: **Все | КС | Акты | Общие документы | Счет-фактура | Аналитика | Реестры**
  - «КС» — `Ks2Table` (КС-2/КС-3) + `ExecutionDocsTable` с фильтром `types=[KS_6A,KS_11,KS_14]`
  - «Акты» — `ExecutionDocsTable` фильтр `types=[AOSR,TECHNICAL_READINESS_ACT]`
  - «Общие документы» — `ExecutionDocsTable` фильтр `types=[GENERAL_DOCUMENT]`
  - «Счет-фактура» — заглушка (в разработке)
- ✅ Вложенный DropdownMenu «Создать документ» в шапке модуля (`CreateDocDropdown.tsx`): 3 группы — Общестроительные работы / Акты КС / Другие; поддерживает `DropdownMenuSub`
- ✅ Карточка `GENERAL_DOCUMENT` (`GeneralDocDialog.tsx`): поля номер/дата/название/примечание, загрузка файлов через Dropzone → S3, вкладки Информация/Файлы/Согласование/Подписание, кнопки «Сохранить» и «Провести» (→ IN_REVIEW)
- ✅ `useGeneralDoc.ts` — хук с `createMutation`, `updateMutation`, `submitMutation`, `uploadAttachment`, `deleteAttachment`
- ✅ API вложений: `GET/POST/DELETE /api/projects/[projectId]/contracts/[cid]/execution-docs/[did]/attachments` (паттерн Gantt-вложений)
- ✅ `ExecutionDocsTable` + `useExecutionDocs` расширены: prop `types?: ExecutionDocType[]`, query `?types=TYPE1,TYPE2`
- ✅ `id-classification.ts`: KS_6A → ACCOUNTING_JOURNAL; KS_11/KS_14 → INSPECTION_ACT; GENERAL_DOCUMENT → OTHER_ID
- ✅ Миграция `20260414070000_add_general_docs`: ALTER TYPE добавляет 4 значения; ALTER TABLE добавляет `documentDate`, `note`, `attachmentS3Keys`

### Добавлено (2026-04-14) — Отмена проведения, автодополнение полей, ограничение объёма ГПР
- ✅ **Отмена проведения** (`POST .../execution-docs/[docId]/unpost`): переводит IN_REVIEW → DRAFT; заблокировано при активном согласовании (ApprovalRoute.status=PENDING); кнопка «Действия → Отменить проведение» в карточке ИД (видна только при статусе IN_REVIEW)
- ✅ **Автодополнение полей АОСР** (`SavedFieldValue`): при Enter в полях 2,3,4,6,7 (Застройщик, Подрядчик, Авторнадзор, Представитель подрядчика, Представитель исполнителя) — сохраняет значение; при фокусе — показывает выпадающий список ранее введённых значений; `SavedFieldInput.tsx` компонент + API `GET/POST /api/projects/[pid]/saved-field-values?field=`
- ✅ **Ограничение объёма ГПР**: при переводе ИД в IN_REVIEW проверяется `factVolume` документа vs `GanttTask.volume` (maxAllowedVolume); если сумма всех проведённых ИД по задаче превышает плановый объём → ошибка «Фактический объём превышает максимально допустимый по задаче ГПР»
- ✅ Миграция `20260414100000_add_saved_field_values`: `ALTER TABLE execution_docs ADD COLUMN "factVolume"`, создание таблицы `saved_field_values` с `@@unique[fieldName, value, projectId]`

### Добавлено (2026-04-14) — Расширение таблицы ИД

- ✅ **8 новых колонок** в `ExecutionDocsTable`: Штамп (иконка), Связанные документы (счётчик), Дата документа, Категория (пользовательская), Версия/правки (`lastEditedAt`), Статус согласования, Активные замечания (только OPEN), Дата начала согласования
- ✅ **Настройка видимости колонок** — кнопка «Колонки» → Dialog с чекбоксами; выбор сохраняется в `localStorage['execution-docs-visible-columns']`
- ✅ **Фильтры с URL query params** — тип (мульти), статус (мульти), Группа ИД, период создания; параметры: `filterTypes`, `filterStatus`, `filterIdCategory`, `filterDateFrom`, `filterDateTo`
- ✅ **Экспорт таблицы** — кнопка «Экспорт» → Excel (ExcelJS) или PDF (Puppeteer); `POST /api/contracts/[cid]/execution-docs/export-table?format=xlsx|pdf`; только выбранные колонки, максимум 200 строк
- ✅ **Исправлен баг**: хук передавал `?types=AOSR,OZR`, API читал только `?type` (ед.ч.) — теперь GET поддерживает оба варианта
- ✅ **Расширен GET API** — дополнительные include: `category`, `approvalRoute`, `_count(linksAsSource, linksAsTarget)`, агрегация открытых замечаний через `openCommentsCount`
- ✅ Новые файлы: `execution-docs-columns.tsx` (типы + колонки), `ColumnVisibilityDialog.tsx`, `ExecutionDocsFilterBar.tsx`, `ExportTableButton.tsx`; рефактор `useExecutionDocs.tsx` + `ExecutionDocsTable.tsx`

### Добавлено (2026-04-14) — Специализированные формы КС-11 и КС-14
- ✅ **Prisma**: `KsActFormData` — новая модель (1:1 к `ExecutionDoc`); поля пп.3,7,9-15; JSON-разделы: `participants`, `indicators`, `workList`, `commissionMembers` (только КС-14); миграция `20260414110000_add_ks_act_form_data`
- ✅ **API** (`/api/projects/[projectId]/contracts/[cid]/ks-acts/`):
  - `GET/POST /ks-acts` — список и создание КС-11/КС-14 (атомарное создание `ExecutionDoc + KsActFormData`)
  - `GET/PATCH /ks-acts/[id]` — деталь и обновление данных формы (upsert)
  - `POST /ks-acts/[id]/print` — генерация PDF через Handlebars + Puppeteer, загрузка в Timeweb S3, возврат pre-signed URL
  - `POST /ks-acts/[id]/autofill` — автозаполнение участников из `ContractParticipant` (Застройщик/Подрядчик/Технадзор)
- ✅ **PDF-шаблоны**: `templates/ks11.hbs`, `templates/ks14.hbs` (структура по ГОСТ Р 70108-2025); `src/lib/ks-act-pdf-generator.ts` (Promise-кэш шаблонов, A4 portrait)
- ✅ **UI-компоненты** (`src/components/modules/ks-acts/`):
  - `KsActDialog.tsx` — диалог с вкладками Форма/Файлы/Согласование/Подписание, кнопка «Печать»
  - `Ks11Form.tsx` — форма КС-11 (пп.3,7,9-15) с React Hook Form
  - `Ks14Form.tsx` — форма КС-14 (аналог + секция «Члены комиссии»)
  - `KsActParticipantsSection.tsx`, `KsActIndicatorsSection.tsx`, `KsActWorkListSection.tsx`, `KsActCommissionSection.tsx` — табличные разделы с диалогами добавления
  - `useKsActForm.ts` — TanStack Query хуки (`useKsActDetail`, `useUpdateKsAct`, `useAutofillParticipants`, `usePrintKsAct`)
- ✅ **Интеграция**: `ExecutionDocsTable.tsx` — клик по строке КС-11/КС-14 открывает `KsActDialog` вместо навигации на страницу документа

---

## МОДУЛЬ 11 — Строительный контроль (СК) ✅

> **Аналог:** ЦУС → Модуль «Строительный контроль»
> **Статус:** Реализован полностью. Шаги 1–10 завершены (2026-04-06).

### Дефектовка ✅
- ✅ Реестр дефектов с фото, GPS, аннотациями
- ✅ Привязка к нормативному документу (ГОСТ, СНиП)
- ✅ Жизненный цикл: Открыт → В работе → Устранён → Подтверждён
- ✅ Автоуведомления при просрочке (cron `prescription-deadline`)
- ✅ Расширение: категория, привязка к проверке и предписанию, флаг приостановки работ

### Вкладка «Проверки» ✅
- ✅ Создание проверки (номер, инспектор, ответственный, позиции ГПР)
- ✅ Фиксация замечаний в ходе проверки (`AddDefectDialog`)
- ✅ Завершение проверки — автогенерация акта и предписания (`CompleteInspectionDialog`)
- ✅ Карточка проверки: 4 вкладки (информация, недостатки, предписания, акты устранения)

### Вкладка «Акты проверки» ✅
- ✅ Реестр актов с PDF-генерацией (Handlebars шаблон `inspection-act.hbs`)
- ✅ Workflow согласования через `ApprovalRoute`

### Вкладка «Предписания» ✅
- ✅ Два типа: Устранение недостатков (УН) / Приостановка работ (ПР)
- ✅ Срок исполнения, ответственный, статус ACTIVE → CLOSED
- ✅ PDF-генерация (шаблоны `prescription-un.hbs`, `prescription-pr.hbs`)
- ✅ Workflow согласования через `ApprovalRoute`

### Вкладка «Недостатки» ✅
- ✅ Расширенный реестр с фильтрами по категории, статусу, сроку
- ✅ accept / reject устранения, продление срока
- ✅ Карточка недостатка с детальными вкладками

### Вкладка «Акты устранения недостатков» ✅
- ✅ Wizard создания: выбор предписания → чекбоксы недостатков → мероприятия
- ✅ PDF-генерация (шаблон `remediation-act.hbs`)
- ✅ Workflow согласования: DRAFT → PENDING_REVIEW → ACCEPTED / REJECTED

### Вкладка «Аналитика» ✅
- ✅ 4 виджета Recharts: категории недостатков, статусы, инспекторы, ответственные
- ✅ Тумблер line/bar/pie, фильтры по периоду

### Вкладка «ОТиТБ» ✅
- ✅ Учёт инструктажей: вводный, первичный, целевой, повторный, внеплановый
- ✅ CRUD: дата, тема, инструктор, список участников, примечания

**База данных (Модуль 11) ✅**
- ✅ `Defect`, `DefectAnnotation` (расширены: category, requiresSuspension, inspectionId, prescriptionId)
- ✅ `Inspection`, `InspectionAct`, `Prescription`, `DefectRemediationAct`, `SafetyBriefing`
- ✅ 5 enum-ов: `InspectionStatus`, `PrescriptionType`, `PrescriptionStatus`, `RemediationActStatus`, `SafetyBriefingType`
- ✅ Миграция: `20260406120000_add_module11_sk`

**Итого реализовано за Модуль 11:**
- 5 новых Prisma-моделей + 5 enum-ов
- 7 вкладок в модуле СК (`/objects/[id]/sk/`)
- 22 API-роута + 2 cron-задачи
- 31 React-компонент + 7 хуков
- 4 Handlebars-шаблона PDF (`templates/sk/`)
- `lib/pdf/sk-pdf-generator.ts`

### Улучшения (2026-04-15) — Аналитика СК: фильтры + метки + Развернуть (ЦУС стр. 288–289)
- ✅ API `GET /sk-analytics` расширен: `?period=week|month|quarter|all`, `?overdueOnly=true`
- ✅ Пресет периода: «За эту неделю» / «За текущий месяц» / «За квартал» / «За всё время» (Select)
- ✅ При period=all сохранён произвольный диапазон дат (dateFrom/dateTo)
- ✅ Чекбокс «Только просроченные» — фильтрует дефекты с deadline < now + status OPEN/IN_PROGRESS
- ✅ Виджет «Статусы нарушений» — числовые метки на сегментах круговой диаграммы (N + %)
- ✅ Кнопка «Развернуть» (Maximize2) на каждом из 4 виджетов → `SkChartExpandDialog` (max-w-3xl, height 420)
- ✅ `SkChartWidget`: новые пропсы `height`, `showLabels`, `onExpand`; `ChartItem` экспортирован
- ✅ Новый компонент `SkChartExpandDialog.tsx` — Dialog с увеличенным графиком

### Улучшения (2026-04-15) — Bulk Export реестров + Word-формат (ЦУС стр. 279–285)
- ✅ Пакетная выгрузка выбранных записей из реестров СК: архив ZIP (отдельные PDF) или сводный PDF
- ✅ API `POST .../inspection-acts/export` — bulk export актов проверки (PDF merge / ZIP → S3)
- ✅ API `POST .../prescriptions/export` — bulk export предписаний (PDF merge / ZIP → S3)
- ✅ API `POST .../defects/export` — сводный PDF / ZIP реестра недостатков (`defects-list.hbs`)
- ✅ API `POST .../remediation-acts/export` — bulk export актов устранения (PDF merge / ZIP → S3)
- ✅ UI `InspectionActsView` — checkbox-колонка + «Скачать выбранные» DropdownMenu (PDF / ZIP)
- ✅ UI `PrescriptionsView` — checkbox-колонка + «Скачать выбранные» DropdownMenu (PDF / ZIP)
- ✅ UI `SkDefectsView` — «Скачать выбранные» DropdownMenu (PDF / ZIP)
- ✅ UI `RemediationActsView` — checkbox-колонка + «Скачать выбранные» DropdownMenu (PDF / ZIP)
- ✅ Word-формат (.doc): `GET .../inspection-acts/[id]/print?format=docx` — HTML→Word через `application/msword`
- ✅ Word-формат (.doc): `GET .../prescriptions/[id]/print?format=docx`
- ✅ Word-формат (.doc): `GET .../remediation-acts/[id]/print?format=docx`
- ✅ UI `InspectionActsView` — кнопка «Печать» в строке: DropdownMenu PDF / Word
- ✅ UI `InspectionActTab` — кнопка «Печать акта»: DropdownMenu PDF / Word
- ✅ UI `PrescriptionCard` — кнопка «Печать»: DropdownMenu PDF / Word
- ✅ UI `RemediationActCard` — кнопка «Печать»: DropdownMenu PDF / Word
- ✅ Новый Handlebars-шаблон `templates/sk/defects-list.hbs` — сводный реестр недостатков (A4, таблица)
- ✅ `sk-pdf-generator.ts`: `renderInspectionActHtml`, `renderPrescriptionHtml`, `renderRemediationActHtml`, `generateDefectsListPdf`

### Улучшения (2026-04-15) — ЦУС стр. 269, 273, 274
- ✅ `Defect.substituteInspectorId String?` + `@relation("DefectSubstituteInspector")` — замещающий инженер СК на время отпуска/болезни основного инспектора; миграция `20260415000000_add_defect_substitute_inspector`
- ✅ UI: поле «Замещающий инженер СК» в `AddDefectDialog` с подсказкой (ЦУС стр. 269)
- ✅ API `add-defect`: принимает и сохраняет `substituteInspectorId`; `useAddDefectToInspection` — тип расширен
- ✅ API `complete` (ЦУС стр. 274): проверка `contractorPresent !== null` и `responsibleId` перед завершением уже реализована
- ✅ UI `CompleteInspectionDialog`: инлайн-ошибка при незаполненном `contractorPresent` уже реализована
- ✅ `DefectNormativeRef` — реестр нормативных ссылок к дефекту (ЦУС стр. 273); миграция `20260415010000_add_defect_normative_refs`
- ✅ API: `GET/POST .../defects/[id]/normative-refs`, `DELETE .../normative-refs/[refId]`; `normativeRefs` включены в DEFECT_INCLUDE
- ✅ UI: вкладка «Стандарты» в `DefectDetailCard` — readonly строка `normativeRef` + CRUD-таблица (`NormativeRefsTab.tsx` + `useNormativeRefs.ts`)

### Добавлено (2026-04-15) — Справочник типовых недостатков (ЦУС стр. 272)
- ✅ `DefectTemplate` — справочник шаблонов дефектов: системные (`isSystem=true`, доступны всем организациям) + пользовательские (привязаны к организации); поля: title, description, category, normativeRef, requirements; 7 системных seed-записей (`prisma/seeds/defect-templates.ts`)
- ✅ API: `GET/POST /api/sk/defect-templates` (поиск по title, пагинация), `DELETE /api/sk/defect-templates/[id]` (только свои не-системные шаблоны)
- ✅ UI: в `AddDefectDialog` — переключатель «Типовой недостаток / Вручную»; диалог `DefectTemplatePickerDialog` с поиском, карточками (title + category badge + «Системный» badge) и кнопкой «Создать шаблон»; выбор шаблона автозаполняет поля: title, description, category, normativeRef
- ✅ Хук `useDefectTemplates` (`src/hooks/useDefectTemplates.ts`): `useDefectTemplates`, `useCreateDefectTemplate`, `useDeleteDefectTemplate`
- ✅ Миграция `20260415020000_add_defect_templates`

### Добавлено (2026-04-15) — Карточка проверки: 6 вкладок по ЦУС стр. 267–271
- ✅ `Inspection.attachmentS3Keys String[] @default([])` — прикреплённые файлы к проверке; миграция `20260415030000_add_inspection_attachments`
- ✅ API: `GET/POST/DELETE /api/projects/[id]/inspections/[id]/attachments` — загрузка, список с presigned URL, удаление файлов (Timeweb S3)
- ✅ Вкладка «Файлы»: `InspectionFilesTab` — загрузка с компьютера, список файлов со скачиванием и удалением, пустое состояние с пояснением
- ✅ Вкладка «Акт проверки»: `InspectionActTab` — таблица (№ акта | Дата выдачи | Кем выдано | Организация проверяющего + кнопка «Печать акта»); статус-зависимое пустое состояние: «Акт не сформирован (нарушения не выявлены)» для завершённых проверок без актов
- ✅ Счётчики на всех вкладках: Недостатки (N) | Предписания (N) | Акт проверки (N) | Файлы (N) | Акты устранения (N)
- ✅ `useInspectionAttachments` хук в `useInspections.ts`; `InspectionActItem.issuedBy` расширен полем `organization`

### Добавлено (2026-04-15) — Предупреждение о дублировании недостатков (ЦУС стр. 276)
- ✅ API `GET .../prescriptions/[id]`: каждый дефект обогащён полями `pendingRemediationActId` / `pendingRemediationActNumber` — ID и номер акта устранения в статусе PENDING_REVIEW, куда дефект уже включён
- ✅ `CreateRemediationDialog` шаг 2: чекбокс недостатка с pending-актом disabled по умолчанию; warning-badge «Уже на проверке в акте №XXX»; кнопка «Всё равно добавить» → включает чекбокс и показывает Toast с предупреждением о приоритете первого акта

---

## МОДУЛЬ 12 — Отчёты ✅ (2026-04-07)

> **Аналог:** ЦУС → Модуль «Отчёты»
> **Завершён:** 2026-04-07 (10 шагов)

- ✅ Prisma-схема: `Report`, `ReportBlock`, `ReportCategory`, `ReportTemplate`, `ThematicReportConfig`
- ✅ URL-структура: `/objects/[objectId]/reports/list | thematic | templates`
- ✅ API роуты: CRUD отчётов, категорий, блоков, автозаполнение, генерация PDF/Excel
- ✅ Конструктор отчётов: категории-дерево, блоки с drag-and-drop, авто-заполнение из БД
- ✅ Тематические отчёты (10 форм): СК, СМР, ГПР, финансовые
- ✅ PDF-генерация (Handlebars + Puppeteer + Timeweb S3)
- ✅ Excel-генерация (exceljs)
- ✅ AI-еженедельная сводка (YandexGPT + Gemini fallback)
- ✅ Глобальный мониторинг по всем объектам (`GlobalMonitoringView`)
- ✅ Управление шаблонами: системные (5 шт.) + пользовательские org-шаблоны

**База данных (Модуль 12)**
- ✅ `ReportTemplate`, `Report`, `ReportBlock`, `ReportCategory`, `ThematicReportConfig`

---

## МОДУЛЬ 13 — ТИМ ✅

> **Аналог:** ЦУС → Модуль «ТИМ» (стр. 285–320)
> **Статус:** ✅ Завершён (Шаги 1–11, 2026-04-17)

### 3D-вьюер ✅
- ✅ Загрузка glTF (.glb) из Timeweb S3 (presigned URL → GLTFLoader → Three.js, без WASM в браузере)
- ✅ Рендеринг геометрии (BufferGeometry + MeshLambertMaterial), OrbitControls, fit-to-view, wireframe
- ✅ Клик на элемент → raycasting → выделение (подсветка #60A5FA)
- ✅ Оригинальные IFC-цвета из модели (IfcSurfaceStyleRendering → RGB, прозрачность) — 2026-04-10
- ✅ Улучшенное освещение (AmbientLight + DirectionalLight + HemisphereLight) — 2026-04-10
- ✅ Светло-серый фон сцены (0xEEEEEE) + трёхточечное освещение
- ✅ Метка вида «Перспектива» в левом верхнем углу canvas
- ✅ Ортогональные виды: спереди/сзади/слева/справа/сверху/снизу (dropdown «Вид» в тулбаре, ЦУС-аналог)
- ✅ Переключение перспектива ↔ ортогональный режим (OrthographicCamera + пересоздание OrbitControls, сохранение позиции перспективы)
- ✅ NavCube: куб ориентации в правом нижнем углу вьюера
- ✅ Горизонтальный тулбар с 6 группами инструментов над canvas
- ✅ Разрезы (ClippingPanel): горизонтальный / вертикальный, до 3 плоскостей, слайдер положения
- ✅ Улучшенный UI разрезов: слайдер позиции + инвертирование (2026-04-17)
- ✅ До 3 плоскостей разреза одновременно (2026-04-17)
- ✅ Измерения расстояний (CSS2DRenderer метки)
- ✅ Управление слоями (IfcPresentationLayerAssignment): чекбоксы, «Показать все» / «Скрыть все»
- ✅ Иконки Eye/EyeOff на каждом узле дерева элементов (hover)
- ✅ Кнопки «Показать все» / «Скрыть все» в панели структуры
- ✅ Скриншот PNG/JPG (canvas.toDataURL + контекстное меню правого клика)
- ✅ Скачивание IFC-файла из S3 (кнопка Download в toolbar)
- ✅ Загрузка по чанкам без блокировки UI (GLTFLoader, Three.js)
- ✅ Режимы отображения: wireframe / X-ray / цвет по типу IFC (ЦУС стр. 302) — dropdown «Отображения» в тулбаре, 4 режима через DropdownMenuRadioGroup
- ✅ Легенда цветов по типу элемента (overlay правый нижний угол canvas, активна только для режима «По типу»)

### Управление моделями ✅
- ✅ Реестр IFC-моделей объекта (`ModelsView`, `ModelVersionsTable`)
- ✅ Загрузка IFC-файлов (.ifc, .ifczip, .ifcxml) через presigned S3 URL
- ✅ Версионирование моделей (`BimModelVersion`, upload-version, история, флаг isCurrent)
- ✅ Фоновый парсинг (BullMQ worker → `parse-ifc.worker.ts` → HTTP POST `/parse` к IfcOpenShell-сервису → `BimElement` в БД с PropertySets)
- ✅ Статусы модели: PROCESSING → CONVERTING → READY / ERROR (`ModelStatusBadge`)
- ✅ Стадии: OTR / PROJECT / WORKING / CONSTRUCTION
- ✅ Дерево разделов (`BimSection`, `SectionTree`) — иерархические папки
- ✅ Совместимость с nanoCAD BIM, Renga, Pilot-BIM, Revit, ArchiCAD (IFC 2x3 / IFC 4)
- ✅ Сравнение версий через ifcdiff (added/deleted/changed attrs/geometry) + экспорт .xlsx
- ✅ ModelVersionsTable: все колонки по ЦУС (№, Наименование, Актуальная, Комментарий, Версия от, Версия до, Автор) + меню ⋮ (Открыть вьюер / Скачать IFC / Сделать актуальной / Загрузить новую версию / Удалить)
- ✅ Выделение актуальной версии (bg-blue-50) + счётчик «Версии модели N» в заголовке
- ✅ Пустое состояние таблицы версий (иконка Building2 + кнопка «Загрузить первую версию»)

### Структура и свойства элементов ✅
- ✅ Левая панель (`ModelStructurePanel`): вкладки «Структура», «Файлы», «Связанные модели»
- ✅ Дерево элементов по уровням (`ModelStructureTree`) — toggle видимости, поиск, выбор → подсветка
- ✅ Правая панель (`ElementPropertiesPanel`): вкладки Инфо / ГПР / Связи / Файлы
- ✅ IFC PropertySets полностью в БД (извлекаются IfcOpenShell при парсинге)
- ✅ Accordion PropertySets в панели свойств элемента
- ✅ Поиск по свойствам элемента
- ✅ Копировать GUID в буфер обмена
- ✅ Поиск элементов по GUID и имени (API с пагинацией, лимит 50–200)

### Привязки и ГПР-шкала ✅
- ✅ Полиморфные привязки `BimElementLink`: элемент ↔ GanttTask / ExecutionDoc / Defect
- ✅ Привязка элемент → задача ГПР (`GprLinkPanel`) и ИД / дефект (`DocumentLinkPanel`)
- ✅ Вкладка «ГПР»: Select версии, список позиций с меню «Привязать» / «Отвязать» / «Следовать за работой»
- ✅ «Следовать за работой» — подсветка синим (#2563EB) всех элементов задачи
- ✅ Цветовая индикация по статусу ИД: серый / зелёный / жёлтый / красный
- ✅ Цветовая индикация по ГПР: план/факт/отклонение (Timeline palette)
- ✅ `TimelineSlider` — бегунок по датам версии ГПР, динамические minDate/maxDate (2026-04-10)
- ✅ API: GET/POST/DELETE `/api/projects/[id]/bim/links/`

### Инструменты ✅
- ✅ Обнаружение коллизий (ifcclash, сервер-side, с допусками и исключениями) — подсветка пары (#EF4444), список результатов
- ✅ Проверка на дублирование элементов (checkDuplicates)
- ✅ Настраиваемые допуски и исключения по IfcType
- ✅ Реестр замечаний ТИМ (`BimIssuesRegistry`) — статусы, приоритеты, ответственный
- ✅ Управление доступом (`BimAccessSettings`): уровни VIEW / ADD / EDIT / DELETE

### IfcOpenShell-сервис ✅
- ✅ Python FastAPI микросервис `services/ifc-service/` на порту 8001
- ✅ `POST /parse` — скачивает IFC из Timeweb S3, извлекает все IfcElement с PropertySets, уровнями, слоями; возвращает JSON с метаданными (ifcVersion, elementCount, IfcProject.Name/author) и массивом элементов
- ✅ `POST /convert` — конвертирует IFC → GLB через IfcConvert (`--use-element-guids`), загружает результат в S3
- ✅ `POST /clash` — обнаружение коллизий между двумя IFC-моделями; использует `ifcopenshell.util.ifcclash` с AABB-fallback
- ✅ `POST /diff` — сравнение двух версий IFC (added/deleted/changed/geometryChanged); использует `ifcopenshell.ifcdiff` с ручным fallback
- ✅ `POST /properties` — полные PropertySets конкретного элемента по GUID через `ifc.by_guid()`
- ✅ `GET /health` — health check для мониторинга
- ✅ Временные файлы: `tempfile.mkdtemp()` + `finally: shutil.rmtree()` — гарантированная очистка
- ✅ Логирование через `logging` (не print); уровень INFO
- ✅ Dockerfile: `python:3.11-slim` + IfcConvert бинарник (распаковка zip → `/usr/local/bin/IfcConvert`)
- ✅ Добавлен в корневой `docker-compose.yml` как сервис `ifc-service` (port 8001)
- ✅ Маппинг S3 переменных: `S3_ACCESS_KEY` → `AWS_ACCESS_KEY_ID` и т.д.
- ✅ `IFC_SERVICE_URL=http://localhost:8001` добавлен в `.env.example`
- ✅ ifcpatch FixWindingOrder перед конвертацией (non-fatal fallback)
- ✅ IfcConvert: --use-element-guids --threads 4 + логирование времени
- ✅ IfcCSV: экспорт элементов модели в CSV с фильтром по ifcType

### URL-структура ✅
- ✅ `/objects/[id]/tim/` — реестр моделей
- ✅ `/objects/[id]/tim/models/[modelId]/` — 3D-вьюер
- ✅ `/objects/[id]/tim/issues/` — замечания ТИМ
- ✅ `/objects/[id]/tim/access/` — управление доступом

### Реализовано (дополнительно)
- ✅ Интеграция `parse-ifc.worker.ts` с IfcOpenShell-сервисом (HTTP-вызов `/parse`)
- ✅ Конвертация IFC → glTF (`convert-ifc.worker.ts` → HTTP-вызов `/convert`, glbS3Key в `BimModel.metadata`)
- ✅ PropertySets сохраняются в БД при парсинге (полностью, через IfcOpenShell-сервис)
- ✅ 3D-вьюер на GLTFLoader (Three.js) — нет WASM в браузере
- ✅ Новый API `GET /bim/models/[id]/glb-url` — presigned URL для .glb или 202 CONVERTING с поллингом
- ✅ IFC PropertySets из БД (сохранены при парсинге IfcOpenShell-сервисом, без клиентского парсинга)
- ✅ BCF-экспорт/импорт замечаний (buildingSMART BCF 2.1)
- ✅ BCF-совместимость с Revit, ArchiCAD, Tekla, nanoCAD BIM
- ✅ Отчёт по сравнению версий (.xlsx)
- ✅ Миграция на IfcOpenShell завершена, пакет web-ifc удалён (Задачи 1–8) — 2026-04-15
- ✅ Визуальное улучшение вьюера до уровня ЦУС — завершено (Задачи 1–11) — 2026-04-17
- ✅ Статус CONVERTING + таймаут 8 мин + уведомление при ошибке
- ✅ Fallback: структура элементов без 3D при ошибке конвертации
- ✅ Polling каждые 5 сек с индикатором времени ожидания
- ✅ IFC_SERVICE_URL через имя Docker-сервиса (не localhost)
- ✅ convert-ifc воркер зарегистрирован в start.sh

### Не реализовано
- ⬜ Федерированные модели (несколько IFC одновременно)
- ⬜ Offline-просмотр (PWA-кэш IFC)
- ⬜ Экспорт в IFC (round-trip)
- ⬜ Публичная ссылка на модель для заказчика
- ⬜ Совместный просмотр (multi-user cursor)
- ⬜ AR-разметка (WebXR)
- ⬜ Интеграция с ИСУП Минстроя (BIM-паспорт)

**База данных (Модуль 13)**
- ✅ `BimModel` (name, status: PROCESSING/READY/ERROR, stage: OTR/PROJECT/WORKING/CONSTRUCTION, s3Key, ifcVersion, elementCount, metadata)
- ✅ `BimModelVersion` (version, isCurrent, s3Key, comment, uploadedById)
- ✅ `BimSection` (иерархия через parentId, order)
- ✅ `BimElement` (ifcGuid, ifcType, name, description, layer, level, properties Json)
- ✅ `BimElementLink` (elementId, entityType, entityId — полиморфная: GanttTask/ExecutionDoc/Defect)
- ✅ `BimAccess`, `BimIssue`
- ✅ Enum: `BimModelStatus`, `BimModelStage`, `BimAccessLevel` (VIEW/ADD/EDIT/DELETE)
- ✅ Индексы: `@@index([modelId])`, `@@index([ifcGuid])`, `@@unique([modelId, ifcGuid])`
---

## МОДУЛЬ 14 — ЭЦП и регуляторный комплаенс

> **Ориентир:** 3–4 недели
> **🔴 Критический приоритет**

### ЭЦП
- ⬜ Абстракция SignatureProvider
- ⬜ КриптоПро CSP (REST API шлюз)
- ⬜ Открепленная подпись (.sig) + встроенная в PDF
- ⬜ Визуальный штамп ЭЦП (ФИО, должность, серийный номер, дата)
- ⬜ Машиночитаемая доверенность (МЧД)
- ⬜ Проверка подписи при открытии документа
- ✅ Подписание КС-2/КС-3 через ApprovalRoute

### Госинтеграции
- ⬜ ИСУП Минстроя: XML-пакеты, BullMQ retry, IsupCodeMapping
- ⬜ XML-схемы Минстроя (АОСР, ОЖР, ЖВК) — обязательны по ГОСТ
- ⬜ ГСН, ЕЦПЭ, ЕИС (для бюджетных объектов)
- ⬜ ФГИС ЦС: индексы цен
- ⬜ API ФНС / ЕГРЮЛ (автозаполнение по ИНН)
- ⬜ Реестр НОСТРОЙ / НРС (СРО, НРС)

### Внешние интеграции
- ⬜ REST API: Синтека, 1С, EXON, U-lab, Cynteka
- ⬜ Webhook-уведомления, OpenAPI / Swagger

### Реестр Минцифры
- ⬜ Аудит совместимости ALT Linux / Astra Linux
- ⬜ Подача заявки (до 45 рабочих дней)

**База данных (Модуль 14)**
- ⬜ `IsupExport`, `IsupCodeMapping`, `ExternalIntegration`, `WebhookSubscription`

---

## МОДУЛЬ 15 — Монетизация и рост

> **Ориентир:** 3–4 недели

### Фаза 1 — Workspace Abstraction ✅ (2026-04-21)
- ✅ Prisma: модели `Workspace`, `WorkspaceMember`, enums `WorkspaceType`/`WorkspaceRole`
- ✅ User: поля `activeWorkspaceId`, `ownedWorkspaces`, `workspaceMemberships`
- ✅ Organization: relation `workspace`; BuildingObject: `workspaceId` + индекс
- ✅ `src/lib/workspaces/create-workspace.ts` — `createCompanyWorkspace` / `createPersonalWorkspace`
- ✅ B2B регистрация и приглашения автоматически создают воркспейс и членство
- ✅ JWT/сессия включает `activeWorkspaceId`
- ✅ `getActiveWorkspaceOrThrow()` в `auth-utils.ts`
- ✅ API-роуты `projects` и `reports` переведены на backward-compatible OR-фильтр
- ✅ Скрипты `backfill-workspace-ids.ts` + `validate-workspace-backfill.ts`

### Система подписок
- ⬜ 4 уровня: Freemium → Профессионал → Команда → Корпоративный
- ⬜ Middleware checkSubscriptionLimits
- ⬜ Гостевой доступ (субподрядчики, заказчики — бесплатно)
- ⬜ Grace period 7 дней (readonly)

### Платёжная система (двухканальная)
- ⬜ App: ЮKassa виджет → Payment(source: 'app')
- ⬜ Tilda: webhook → Payment(source: 'tilda') → та же БД
- ⬜ Автосписание через ЮKassa Autopayments API

### Tilda (лендинг + SEO)
- ⬜ Лендинг, тарифы, SEO-блог
- ⬜ Раздел бесплатных шаблонов (SEO-приманка)
- ⬜ UTM-метки → User.utmSource

### Портал субподрядчика (вирусный рост)
- ⬜ Бесплатный readonly-доступ к своей части ИД
- ⬜ Согласование АОСР онлайн без регистрации

### Реферальная программа
- ⬜ Реферальный код (base62(userId + random))
- ⬜ Вознаграждение после оплаты первого месяца
- ⬜ Кредит на аккаунт → кэшбэк после 100+ рефераций

### Портал заказчика
- ⬜ Статус ИД в реальном времени
- ⬜ Еженедельные AI-сводки (YandexGPT)

**База данных (Модуль 15)**
- ⬜ `Subscription`, `SubscriptionPlan`, `Payment`, `GuestAccess`
- ⬜ `Referral`, `ReferralReward`

---

## МОДУЛЬ 16 — Мобильное приложение (PWA)

> **Ориентир:** 4–6 недель

- ✅ Фаза 1 — Service Worker и Manifest:
  - ✅ Шаг 1.1: Миграция с next-pwa на Serwist
  - ✅ Шаг 1.2: SW кэш-стратегии + offline fallback (`/~offline`)
  - ✅ Шаг 1.3: Web App Manifest + иконки-заглушки (`src/app/manifest.ts`, `public/icons/`)
  - ✅ Шаг 1.4: InstallPrompt (Android `beforeinstallprompt` + iOS Safari инструкция)
  - ✅ Шаг 1.5: Zustand network store + OfflineBanner + heartbeat `/api/ping`
- ✅ Фаза 2–3 — IndexedDB + Offline-first hooks: `idb` слой, stores (journal-drafts, photos-queue, sync-queue), `useOfflineQuery`/`useOfflineMutation`, BackgroundSync очередь
- ✅ Фаза 4 — Push-уведомления (VAPID, self-hosted, ФЗ-152): `web-push`, модель `PushSubscription`, API `/api/push/subscribe|unsubscribe`, `src/lib/push/` (send-push, client, notification-adapter), SW обработчики push/notificationclick/pushsubscriptionchange, страница `/settings/notifications`, интеграция с BullMQ notification.worker
- ✅ Фаза 5 — Камера, GPS, геозоны (2026-04-20):
  - ✅ `CameraCapture` — съёмка фото с GPS, сжатие, сохранение в IDB offline-first
  - ✅ `lib/geofencing/distance.ts` — haversine + checkGeofence (радиус 300 м)
  - ✅ `SignWithGps` — UI проверки геозоны перед подписанием АОСР
  - ✅ Signature модель — GPS поля (`gpsLat`, `gpsLng`, `gpsAccuracy`, `signedAtLocation`)
  - ✅ Sign API route — принимает GPS, вычисляет геозону, создаёт Signature с типом SIMPLE
  - ✅ `VoiceInput` — Web Speech API голосовой ввод (ru-RU)
  - ✅ `api/voice/transcribe` + `lib/voice/yandex-speechkit.ts` — транскрипция через Yandex SpeechKit
- ⬜ Фаза 6 — Mobile-first shell и полировка (MobileShell, быстрые формы, Lighthouse CI)
- ⬜ Синхронизация при восстановлении (conflict resolution)
- ⬜ 360° фотодокументация

---

## МОДУЛЬ 17 — AI-ассистент

> Расширение существующей YandexGPT-инфраструктуры ✅
> **Ориентир:** 2–3 недели

- ✅ YandexGPT интегрирован (парсинг смет)
- ⬜ NLP-поиск по документам проекта (RAG + YandexGPT)
- ⬜ AI-проверка комплектности ИД
- ⬜ Контекстные подсказки при заполнении актов (ссылки на приказ №344/пр)
- ⬜ Проверка: дата АОСР ≥ дата начала работ по КС-6а
- ⬜ AI-еженедельная сводка для заказчика
- ⏸ Голосовой ввод задач (после мобильного)

---
---

## МОДУЛЬ 18 — Планировщик задач (Task Manager) ⬜

> **Аналог:** ЦУС → Инструмент «Планировщик задач» (стр. 351–365 руководства)
> **Отличие от УП:** УП — иерархия мероприятий объекта. Планировщик задач — глобальный task-manager (как Jira/Asana).
> **Цель:** полноценный task-management с ролями, жизненным циклом, группами, шаблонами, расписанием, 5 представлениями.

### База данных (TASK.1) ✅ (2026-04-17)
- ✅ Расширение Task: typeId, groupId, templateId, plannedStartDate, actualStartDate, completedAt, duration (минуты), isReadByAuthor, publicLinkToken + relations (roles, labels, checklist, reports) — все новые поля опциональные, УП не затронут
- ✅ TaskStatus расширен: PLANNED, UNDER_REVIEW, REVISION, IRRELEVANT (legacy OPEN/IN_PROGRESS/DONE/CANCELLED сохранены)
- ✅ TaskRole — M:N роли (AUTHOR/EXECUTOR/CONTROLLER/OBSERVER), unique(taskId, userId, role)
- ✅ TaskGroup (name, parentId, visibility, visibleUserIds[], order, authorId, organizationId)
- ✅ TaskLabel (name, color, groupId, organizationId) + TaskLabelOnTask
- ✅ TaskType (key @unique, name, isSystem, organizationId?) — системные: task, meeting, fix
- ✅ TaskTemplate (name, description, typeId, groupId, parentTemplateId, priority, duration, s3Keys[], authorId)
- ✅ TaskSchedule (repeatType, interval, weekDays[], monthDays[], startDate, endDate, isActive, createSubTasks, lastRunAt)
- ✅ TaskChecklistItem (title, done, order, s3Keys[])
- ✅ TaskReport (progress, newDeadline, s3Keys[], authorId)
- ✅ Миграция `20260417000000_add_task_manager_module` + seed системных TaskType в `prisma/seed.ts`

### API (TASK.2) ✅ (2026-04-17)
- ✅ GET/POST /api/tasks — глобальный реестр (группировки + 9 counts за один запрос, visibleTo=me, фильтры)
- ✅ GET/PATCH/DELETE /api/tasks/[id] — карточка задачи с полными relations
- ✅ Task actions /api/tasks/[id]/actions: start, send-to-review, cancel-review, review-start, accept, return-to-revision, discuss, mark-irrelevant, redirect, delegate, copy, to-template, create-subtask (state machine с проверкой роли и статуса)
- ✅ /api/task-groups CRUD + /api/task-labels CRUD + /api/task-types (GET/POST/DELETE, ADMIN-guard) + /api/task-templates CRUD + /api/task-templates/[id]/instantiate + /api/task-schedules CRUD
- ✅ /api/tasks/[id]/checklist (GET/POST/PATCH/DELETE) + /api/tasks/[id]/reports (GET/POST) + /api/tasks/[id]/public-link (POST/DELETE)
- ✅ BullMQ воркер src/lib/workers/task-schedule.worker.ts — cron */15 * * * *, shouldRun по repeatType, createSubTasks support
- ✅ src/lib/task-visibility.ts — canUserSeeTask + buildTaskVisibilityWhere (multi-tenancy через project.organizationId)
- ✅ src/lib/validations/task.ts — все Zod-схемы модуля (13 action variants discriminatedUnion)

### UI — глобальная страница (TASK.3) ✅ (2026-04-17)
- ✅ /planner — глобальный планировщик (layout 300px + flex-1, -m-6 компенсация padding)
- ✅ Левая панель группировок: Активные/Выполняю/Контролирую/Наблюдаю/Созданные мной/Неактуальные/Просроченные/Выполненные/Шаблоны + Группы задач (с CRUD, подгруппы, метки, видимость)
- ✅ Правая часть: список задач TanStack Table (9 колонок, жирный если !isReadByAuthor, пагинация, аватары исполнителей, цветные метки)
- ✅ Вкладки представлений (Список задач активен; +кнопка для TASK.4 disabled)
- ✅ Тулбар: кнопка + (Задача/Шаблон/На основе шаблона — TASK.5/6 заглушки), фильтр периода (Сегодня/Неделя/Всё время с counts), поиск с debounce 300ms
- ✅ SidebarNav: пункт «Планировщик задач» ClipboardList href=/planner
- ✅ /api/tasks: расширен counts — добавлены today и week (deadline-based)

### 5 представлений (TASK.4) ✅ (2026-04-17)
- ✅ Многовкладочная система (localStorage `stroydocs-planner-views` + X-кнопка закрытия + dropdown +)
- ✅ Синхронизация фильтров с URL query (grouping, groupId, search, period)
- ✅ Список задач (TanStack Table) — уже был реализован
- ✅ Канбан-доска (7 колонок по статусам, @dnd-kit DnD, проверка ролей, quick-create)
- ✅ Календарь (react-big-calendar + dateFnsLocalizer, month/week/day/agenda, drag deadline)
- ✅ Краткий список (compact rows, мобильный дизайн)
- ✅ Лента новостей (Task + TaskReport, хронологически, пагинация «Загрузить ещё»)
- ✅ API GET /api/tasks/feed (задачи + отчёты слиты и отсортированы по timestamp desc)

### Шаблоны и автоматизация (TASK.5)
- ✅ Список шаблонов в группировке «Шаблоны» (`TaskTemplatesView` — таблица: Название/Тип/Группа/Приоритет/Длительность/Активных расписаний/Создан/Автор)
- ✅ Создание шаблона с нуля (`CreateTaskTemplateDialog` — поля из ЦУС Таблица 15: название, описание, тип, группа, шаблон-основание, приоритет, длительность)
- ✅ Карточка шаблона — вкладки «Параметры» (ред.), «Расписание», «Файлы» (S3 upload), «Созданные задачи»
- ✅ `AddScheduleDialog` — поля из ЦУС Таблица 16: повторяемость (DAY/WEEK/MONTH/YEAR), интервал, дни недели (toggle), дни месяца (grid), даты start/end, active/createSubTasks switch
- ✅ `SelectTemplateDialog` — «На основе шаблона» в меню планировщика: поиск, выбор, instantiate (объект + роли + даты)
- ✅ BullMQ cron-воркер `task-schedule.worker.ts` реализован в TASK.2 (shouldRun, processSchedules, 15 мин, уведомления)
- ✅ Кнопки тулбара «Новый шаблон» и «На основе шаблона» активированы
- ✅ Счётчик шаблонов в левой панели
- ✅ Кнопка «Создать шаблон» из карточки задачи (to-template action) — реализовано в TASK.6

### Карточка задачи расширенная (TASK.6)
- ✅ 4 роли с кнопками «Действия» для каждой (контролёр: начать проверку / принять / вернуть / обсудить; исполнитель: взять / отправить / делегировать / перенаправить; наблюдатель: комментарии) — `TaskActionsMenu.tsx`
- ✅ Чек-лист с drag-and-drop сортировкой, прогресс-баром, inline-добавлением — `TaskChecklistTab.tsx`
- ✅ Вкладка «Отчёты о выполнении» — `TaskReportsTab.tsx` + `AddTaskReportDialog.tsx`
- ✅ Копировать ссылку на задачу — POST /api/tasks/[id]/public-link + clipboard
- ✅ Счётчик непрочитанных изменений (жирный шрифт в списке) — `isReadByAuthor` в TaskListView/TaskBriefListView
- ✅ `TaskDetailDialog` — Sheet (90vw, max-w-5xl): header с инлайн-редактированием title, статус-badge, меню ⋮, 6 вкладок (Описание/Чек-лист/Отчёты/Подчинённые/Обсуждение/История), боковая панель с датами и участниками
- ✅ `TaskDetailSidebar` — даты, 4 секции участников (Автор/Контролёры/Исполнители/Наблюдатели), метаданные
- ✅ `TaskDiscussionTab` + `TaskComment` модель + GET/POST /api/tasks/[id]/comments
- ✅ `TaskHistoryTab` — timeline из отчётов и действий
- ✅ `TaskChildrenTab` — список подчинённых задач + кнопка создания
- ✅ `ConfirmActionDialog` — ввод причины (return-to-revision, discuss) или выбор пользователя (delegate, redirect)
- ✅ `CreateTaskDialogFull` — полноценный диалог создания задачи (все поля ЦУС Таблица 17: объект, тип, группа, метки, приоритет, исполнители, контролёры, наблюдатели)
- ✅ Кнопка «+ Задача» в тулбаре планировщика активирована

### Боковая выезжающая панель (TASK.7)
- ✅ Значок-триггер в шапке (на всех страницах) — `ClipboardList` рядом с колокольчиком уведомлений
- ✅ Sheet с превью задач + кнопки «Все задачи» и «+ Добавить»
- ✅ Badge с количеством просроченных задач (красный, "9+" при > 9)
- ✅ `TasksQuickPanel` — самодостаточный компонент (trigger + Sheet), 20 активных задач пользователя, сортировка по дедлайну
- ✅ Карточки задач: красный левый бордер для просроченных, жирный текст для непрочитанных, счётчики отчётов и чек-листа
- ✅ Клик на карточку → `TaskDetailDialog`, «Все задачи» → `/planner`, «+ Добавить» → `CreateTaskDialogFull`
- ✅ `useTasksPanel` — React Query хук (polling 30 сек, `grouping=active&visibleTo=me`)

---
---

# ТЕХНИЧЕСКИЙ ДОЛГ И СКВОЗНЫЕ ЗАДАЧИ

- ⬜ Справочник нормативных документов (СНиП, СП, ГОСТ) — tsvector-поиск
- ⬜ CI/CD: GitHub Actions → Timeweb Cloud
- ⬜ Мониторинг (логи, алерты)
- ⬜ Политика конфиденциальности (ФЗ-152)
- ⬜ Onboarding wizard: первый АОСР за < 5 минут
- ⬜ Email-цепочка онбординга: Day 1 → 3 → 7 → 12 (BullMQ + SMTP)
- ⬜ Аттестация ФСТЭК для работы с ГИС
- ⏸ OCR сканов (Yandex Vision API) — после PMF
- ⏸ Белая метка (white-label) — для крупных генподрядчиков
- ⏸ Маркетплейс шаблонов — после комьюнити

---

# ТЕХНИЧЕСКИЕ РЕШЕНИЯ (справка)

| Задача | Решение |
|--------|---------|
| PDF-генерация | Handlebars → Puppeteer → Timeweb S3 |
| Редактирование документов | TipTap (WYSIWYG) + `overrideHtml` в БД |
| .docx-шаблоны | docxtemplater + плейсхолдеры `{field}` |
| Парсинг смет | xml2js (XML) / exceljs+YandexGPT (xlsx) / pdf-parse+GPT (PDF) |
| ЭЦП | Абстракция `SignatureProvider` → КриптоПро REST |
| Multi-tenancy | Prisma filter по `organizationId` + Row Level Security |
| Очереди | BullMQ + Timeweb Managed Redis |
| Файлы | Timeweb S3 (ФЗ-152 ✅, aws-sdk v3, forcePathStyle: true) |
| Чат | Socket.io self-hosted (серверы РФ ✅) |
| AI | YandexGPT (основной) + Gemini (fallback) |
| Поиск | PostgreSQL tsvector → pgvector (AI-поиск в Фазе 8) |
| Офлайн | Serwist + IndexedDB (Фаза 6) |
| Аналитика | Recharts, TanStack Table v8 |

---

## ЦУС — Виджеты дашборда (стр. 312–313, 321, 334–335, 328–350)

- ✅ IssuesWidget — «Актуальные вопросы» (PieChart/таблица + drill-down по типам ProblemIssue)
- ✅ ContractsWidget — «Контрактация по контрактам» (таблица типов + разворачиваемая детализация)
- ✅ StagesWidget — «Стадии реализации» (список GanttStage + modal с объектами)
- ✅ API: `/api/dashboard/issues`, `/api/dashboard/contracts-by-type`, `/api/dashboard/stages-objects`

### Добавлено (2026-04-16) — Финансовые виджеты ЦУС (стр. 328–350)
- ✅ **DefectStatusWidget** (`defect_status`) — PieChart donut: сектора = статусы недостатков, центр = всего; клик → modal с таблицей дефектов (reuse sk-drill)
- ✅ **FundingPlanWidget** (`funding_plan`) — PieChart donut: сектора = источники финансирования (фед./рег./мест./собств./внебюдж.), центр = общая сумма; клик → modal с разбивкой по объектам
- ✅ **ContractsPaymentWidget** (`contracts_payment_bar`) — BarChart: 2 бара на год (Оплачено / Плановые) из `contractsPayments`
- ✅ **ContractsPaymentDonutWidget** (`contracts_payment_donut`) — PieChart donut: Оплачено / Отклонение, центр = сумма плановых; клик → modal с объектами (план/факт/отклонение)
- ✅ **SmrOsvoenoWidget** (`smr_osvoeno`) — PieChart donut: Выполнено / Остаток по СМР-контрактам; фильтр по годам; клик → modal с объектами
- ✅ **FinancingStatusWidget** (`financing_status`) — BarChart: 2 бара на год (Факт / План финансирования) из `financingByYear`
- ✅ **PaidByProjectWidget** (`paid_by_project`) — BarChart: 2 бара (Оплачено по контрактам / План финансирования) + сводка собственные/заёмные
- ✅ Новые API: `/api/dashboard/funding-drill`, `/api/dashboard/payment-drill`, `/api/dashboard/smr-drill`
- ✅ Все 7 виджетов зарегистрированы в `DashboardWidgetsGrid` + `DEFAULT_WIDGETS` (position 14–20, `isVisible: false`)

## ЦУС — Индикаторы инфопанели объекта + ObjectPassportDialog (апрель 2026, стр. 311, 334–346)
- ✅ API `GET /api/projects/[projectId]/dashboard-indicators` → `{ gprExec, pirOsv, smrOsv, payments }` — каждый индикатор: `planTotal`, `planToday`, `factTotal`, `percent`, `status` (OK/OVERDUE/AHEAD)
- ✅ `ObjectInfoHeader`: 4 богатых `IndicatorWidget` с цветовым семафором (красный/жёлтый/зелёный), форматом млрд/млн, строкой «План на <дата>: X» и статусом (Просрочено / Перевыполнение / В срок)
- ✅ `ObjectPassportDialog`: всплывающее окно с 8 вкладками (Паспорт / Показатели / Финансирование / Контракты / Стройконтроль / Проблемные вопросы / Задачи / Фотогалерея)
- ✅ `MapWidget` → вкладка «Таблица»: клик на строку объекта открывает `ObjectPassportDialog`
- ✅ `GprMonitoringWidget` → диалог группы: клик на объект открывает `ObjectPassportDialog`

---

---

## МОДУЛЬ 19 — Справочники (Reference Data) ✅

> **Аналог:** ЦУС → Главное меню «Справочники» → Общие справочники (стр. 366–372 руководства)
> **Цель:** единый UI-фреймворк для всех справочников системы по принципу ЦУС: «Работа со всеми справочниками организована по единому принципу».

### Инфраструктура (REF.1) ✅ 2026-04-17
- ✅ Универсальный компонент `<ReferenceTable>` — таблица с настройкой колонок (боковая панель чекбоксов), фильтрацией, сортировкой, пагинацией, bulk-операциями
- ✅ Универсальный Excel-экспорт: 3 варианта (все доступные колонки / отображаемые / все данные)
- ✅ Универсальный диалог редактирования `<ReferenceEditDialog>` (декларативные поля)
- ✅ Меню действий (⋮): Информация / Редактировать / Удалить / Скопировать ссылку
- ✅ Массовое удаление через чекбоксы
- ✅ Диалог подтверждения удаления
- ✅ Shareable link: `/references/[slug]/entry/[id]` — прямая ссылка на запись
- ✅ `src/lib/references/types.ts` — `FieldType`, `ReferenceFieldSchema`, `ReferenceSchema`
- ✅ `src/lib/references/registry.ts` — `REFERENCE_REGISTRY`, `getReferenceSchema`, `listReferenceSchemas`
- ✅ API: `GET/POST /api/references/[slug]`, `GET/PATCH/DELETE /api/references/[slug]/[id]`, `POST /api/references/[slug]/bulk-delete`, `POST /api/references/[slug]/export`

### Audit (REF.2) ✅ 2026-04-17
- ✅ Модель `ReferenceAudit` — enum `ReferenceAuditAction` (CREATE/UPDATE/DELETE), поля `entityType/entityId/action/oldValues/newValues/changedFields`, named relation к User ("ReferenceAuditUser") и relation к Organization с onDelete: Cascade
- ✅ Утилита `src/lib/references/audit.ts` — `writeAudit()` + `diffObjects()`
- ✅ Обновлены API-роуты (POST/PATCH/DELETE/bulk-delete) — используют `writeAudit` вместо прямых `db.referenceAudit.create`
- ✅ `GET /api/references/[slug]/audit` — cursor-based пагинация, фильтры по entityId и диапазону дат, include user
- ✅ `<ReferenceAuditPanel>` — боковая панель 480px: список с подгрузкой, иконки по action, ФИО + relative time + tooltip точного времени, раскрывающийся дифф полей для UPDATE
- ✅ Кнопка «История» (иконка History) в `<ReferenceTable>` открывает панель (скрыта если `auditable: false`)

### Базовые справочники (REF.3) ✅ 2026-04-18
- ✅ Currency (Валюты): 9 валют (RUB/USD/EUR/CNY/JPY/GBP/CHF/KZT/BYN), ISO 4217, scope: organization — `prisma/seeds/reference-books.ts`
- ✅ BudgetType (Типы бюджета): 6 типов (FED/REG/LOC/OWN/CREDIT/SENIOR_CREDITOR) с HEX-цветами для дашборда
- ✅ MeasurementUnitRef (Единицы измерения): 25 единиц ГОСТ 8.417-2002 по категориям, scope: organization
- ✅ DeclensionCase (Падежи): 6 падежей русского языка, scope: system, adminOnly: true
- ✅ buildWhere в API-роуте расширен: системные записи (isSystem=true, organizationId=null) видны всем организациям через OR-фильтр
- ✅ registry.ts заполнен: 4 схемы (currencies/budgetTypes/measurementUnits/declensionCases)

### Базовые справочники (REF.4) ✅ 2026-04-18
- ✅ ContractKind (Виды контрактов): 11 системных записей (СМР/ПИР/Поставка/Экспертиза и т.д.), scope: organization — миграция `add_contract_doc_budget_references`
- ✅ DocumentTypeRef (Типы документов): 17 системных записей (10 × module='ID' + 7 × module='SED'), scope: organization
- ✅ BudgetExpenseItem (Бюджетные статьи расходов): иерархия 3 уровня (5 корневых + 5 дочерних), scope: organization
- ✅ `ReferenceSchema` расширен: `hierarchical?`, `parentKey?`; `ReferenceFieldSchema` — `hidden?`
- ✅ `ReferenceTable` поддерживает tree-режим: expand/collapse, отступы по уровням, «Добавить дочернюю запись» в меню действий
- ✅ `ReferenceEditDialog` — prop `defaultValues?` для предзаполнения скрытых полей (parentId, level) при создании дочерних записей
- ✅ `useReferenceTable` — при `hierarchical: true` загружает limit=500 без пагинации
- ✅ registry.ts — 3 новые схемы: contractKinds / documentTypes / budgetExpenseItems (category: documentary/financial)

### Базовые справочники (REF.5) ✅ 2026-04-19
- ✅ `DefectCategoryRef` — 6 записей (QUALITY_VIOLATION/TECHNOLOGY_VIOLATION/FIRE_SAFETY/ECOLOGY/DOCUMENTATION/OTHER), поля: name, code, color, requiresSuspension, isSystem, isActive; миграция `add_type_refs`
- ✅ `ProblemIssueTypeRef` — 10 записей (CORRECTION_PSD/…/OTHER), поля: name, code, isSystem, isActive; миграция `add_type_refs`
- ✅ `TaskTypeRef` — 3 записи (task/meeting/fix), поля: name, code, color, icon, isSystem, isActive; отдельная таблица `task_types_ref` от `task_types`
- ✅ Опциональные FK: `Defect.categoryRefId → DefectCategoryRef`, `ProblemIssue.typeRefId → ProblemIssueTypeRef` (enum-поля сохранены для обратной совместимости)
- ✅ `src/lib/references/ref-mapper.ts` — Redis-кэшированный маппер `code → ref.id`; используется в Defect/ProblemIssue API (POST create, PATCH update)
- ✅ `prisma/seeds/migrate-enums-to-refs.ts` — однократный миграционный скрипт: `npx ts-node prisma/seeds/migrate-enums-to-refs.ts`
- ✅ registry.ts: 3 новые схемы — `taskTypeRefs` (common), `defectCategories` (construction), `problemIssueTypes` (construction)

### UI и навигация (REF.6) ✅ 2026-04-19
- ✅ Навигация: пункт «Справочники» (Library icon) в SidebarNav — href='/references'
- ✅ `/references` — каталог-страница: поиск, группировка по категориям (Общие/Строительные/Финансовые/Документарные), карточки с иконкой/описанием/счётчиком записей, вкладки «Все / Системные» (только для ADMIN)
- ✅ `/references/[slug]` — страница конкретного справочника с хлебными крошками и `<ReferenceTable>`
- ✅ `/references/[slug]/entry/[id]` — full-page shareable-link на запись справочника с кнопкой «Редактировать»
- ✅ `description?` и `icon?` добавлены в `ReferenceSchema`; заполнены для всех 10 справочников REF.3-REF.5
- ✅ API: `GET /api/references/[slug]?count=true` — возвращает `{ count: N }` для каталога
- ✅ `src/lib/references/constants.ts` — CATEGORY_LABELS, CATEGORY_ORDER (переиспользуется в каталоге и slug-страницах)

### Интеграция существующих (REF.7) ✅ 2026-04-19
- ✅ KsiNode → `/references/ksi`; scope='system' (просмотр всем, запись только ADMIN); hierarchical+lazyLoad=true — серверная пагинация с поиском по code/name; уровень иерархии отображается отступом
- ✅ MaterialNomenclature → `/references/nomenclature`; scope='organization'
- ✅ DocumentTemplate → `/references/document-templates`; scope='organization'; category — select с опциями DocTemplateCategory
- ✅ StampTitle → `/references/stamp-titles`; scope='organization'
- ✅ TaskType → `/references/task-types`; scope='organization'
- ✅ Фикс `buildWhere`: модели без поля `isSystem` фильтруются только по `organizationId` (нет Prisma-ошибки unknown field)
- ✅ `ReferenceSchema` расширена полем `lazyLoad?: boolean`; при true — tree-рендеринг отключён, серверная пагинация включена
- ✅ Иконки FolderTree/Package/Stamp/FileText/Tag добавлены в ICON_MAP страницы `/references/[slug]`

### Замена hardcoded значений (REF.8) ✅ 2026-04-19
- ✅ `WarehouseMovement`: добавлен `currencyId String?` → `currencyRef Currency?`; старое поле `currency String` сохранено с TODO-комментарием
- ✅ `Contract`: добавлен `contractKindId String?` → `contractKind ContractKind?` (ContractType enum **оставлен** — ортогональные измерения)
- ✅ `FundingSource`: добавлен `budgetTypeId String?` → `budgetType BudgetType?`; старый `type FundingType` сохранён с TODO-комментарием
- ✅ Миграция `prisma/migrations/20260419010000_add_currency_contractkind_budgettype_fk/migration.sql`
- ✅ Миграционный скрипт `prisma/seeds/migrate-currencies.ts` (идемпотентный, best-effort маппинг)
- ✅ `src/lib/references/resolvers.ts` — хелперы `getCurrencyByCode/getBudgetTypeByCode/getContractKindByCode` с Redis TTL 1ч
- ✅ API: warehouse-movements/create-from, create-based-on — копируют `currencyId`
- ✅ API: `/api/dashboard/analytics` — `contractsByType` теперь группирует по `contractKindId`; `/api/dashboard/contracts-by-type` фильтрует по `contractKindId`
- ✅ API: `/api/projects/[projectId]/funding` — принимает и возвращает `budgetTypeId`/`budgetType`
- ✅ UI: `ContractsWidget` показывает `ContractKind.name` вместо enum-лейблов; `__NONE__` с иконкой ⚠️
- ✅ UI: `CreateContractDialog` — новый Select «Вид работ» из справочника ContractKind
- ✅ UI: `ContractsList` — баннер «У N договоров не указан вид работ»
- ✅ UI: `WarehouseMovDocTab` — отображение валюты через `currencyRef.name` (fallback на legacy)
- ✅ Тип `useFunding.FundingSource` расширен `budgetTypeId/budgetType`; добавлен `useBudgetTypes` хук

---

# КАК РАБОТАТЬ С ЭТИМ ФАЙЛОМ

В начале каждой рабочей сессии говори Claude Code:

```
Прочитай CLAUDE.md и ROADMAP.md.
Текущая фаза: [номер].
Сегодня работаем над: [задача].
```

Когда задача выполнена — меняй ⬜ на ✅ вручную или попроси Claude:

```
Отметь в ROADMAP.md как выполненное: [название задачи]
```

---

**Текущий статус:** работа последовательно по модулям.
