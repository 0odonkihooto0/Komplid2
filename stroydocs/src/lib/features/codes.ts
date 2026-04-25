/**
 * Единый реестр feature-кодов StroyDocs.
 *
 * Правила именования:
 *  - Ключи и значения — UPPER_SNAKE_CASE
 *  - Для новых кодов: значение = ключ (идемпотентная строка, хранится в БД)
 *  - Для кодов, созданных до этого реестра: значение — исходная lowercase-строка
 *    для обратной совместимости с БД (поле SubscriptionPlan.features: Json[])
 *
 * Как использовать:
 *   import { FEATURE_CODES } from '@/lib/features/codes';
 *   await requireFeature(workspaceId, FEATURE_CODES.AOSR_GENERATION);
 *
 * Запрещено:
 *   await requireFeature(workspaceId, 'aosr_generation'); // raw-строка
 */

// ---------------------------------------------------------------------------
// B2C Профи-пакеты (новые коды из AUTH_ONBOARDING_ROLES_PLAN, Фаза A)
// ---------------------------------------------------------------------------

export const FEATURE_CODES = {
  // B2C пакеты
  SMETCHIK_STUDIO_ACCESS: 'SMETCHIK_STUDIO_ACCESS',
  ID_MASTER_ACCESS: 'ID_MASTER_ACCESS',
  PRORAB_JOURNAL_ACCESS: 'PRORAB_JOURNAL_ACCESS',

  // B2B
  TEAM_MULTI_USER: 'TEAM_MULTI_USER',
  CORPORATE_ISUP_INTEGRATION: 'CORPORATE_ISUP_INTEGRATION',

  // AI / OCR
  AI_COMPLIANCE_CHECK: 'AI_COMPLIANCE_CHECK',
  AI_SMETA_IMPORT: 'AI_SMETA_IMPORT',
  OCR_SCAN: 'OCR_SCAN',

  // Портал и доступ
  PUBLIC_DASHBOARD: 'PUBLIC_DASHBOARD',
  GUEST_INVITATION: 'GUEST_INVITATION',

  // Будущие — MODULE17 (Фаза 3: Мой Ремонт / Портал заказчика)
  CUSTOMER_HIDDEN_WORKS_CHECKLISTS: 'CUSTOMER_HIDDEN_WORKS_CHECKLISTS',
  CUSTOMER_AI_LAWYER: 'CUSTOMER_AI_LAWYER',
  CUSTOMER_CLAIM_TEMPLATES: 'CUSTOMER_CLAIM_TEMPLATES',
  MARKETPLACE_BOOST: 'MARKETPLACE_BOOST',

  // ---------------------------------------------------------------------------
  // Существующие коды из src/lib/subscriptions/features.ts
  // Значения сохранены в lowercase для обратной совместимости с БД
  // ---------------------------------------------------------------------------

  // Сметы
  ESTIMATES: 'estimates',
  ESTIMATES_IMPORT: 'estimates_import',
  ESTIMATES_COMPARE_BASIC: 'estimates_compare_basic',
  ESTIMATES_COMPARE_ADVANCED: 'estimates_compare_advanced',
  ESTIMATES_EXPORT_GRAND_SMETA: 'estimates_export_grand_smeta',
  ESTIMATES_PUBLIC_LINK: 'estimates_public_link',
  ESTIMATES_HISTORY: 'estimates_history',
  FGIS_CS_PRICES: 'fgis_cs_prices',

  // ИД (исполнительная документация)
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

  // Мобильное приложение
  MOBILE_PWA: 'mobile_pwa',
  MOBILE_OFFLINE: 'mobile_offline',
  VOICE_INPUT: 'voice_input',

  // Строительный контроль
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

export type FeatureCode = typeof FEATURE_CODES[keyof typeof FEATURE_CODES];

/**
 * Лимитные ключи плана (числовые ограничения).
 * Используются в getActiveLimit() для проверки квоты.
 */
export const LIMIT_KEYS = {
  MAX_OBJECTS: 'maxObjects',
  MAX_STORAGE_GB: 'maxStorageGB',
  MAX_GUESTS: 'maxGuests',
  MAX_ACTIVE_ESTIMATES: 'maxActiveEstimates',
  MAX_DOCUMENTS_PER_MONTH: 'maxDocumentsPerMonth',
  MAX_PHOTOS_PER_MONTH: 'maxPhotosPerMonth',
} as const;

export type LimitKey = typeof LIMIT_KEYS[keyof typeof LIMIT_KEYS];
