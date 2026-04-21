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

export type FeatureKey = (typeof FEATURES)[keyof typeof FEATURES];

export const LIMIT_KEYS = {
  MAX_OBJECTS: 'maxObjects',
  MAX_STORAGE_GB: 'maxStorageGB',
  MAX_GUESTS: 'maxGuests',
  MAX_ACTIVE_ESTIMATES: 'maxActiveEstimates',
  MAX_DOCUMENTS_PER_MONTH: 'maxDocumentsPerMonth',
  MAX_PHOTOS_PER_MONTH: 'maxPhotosPerMonth',
} as const;

export type LimitKey = (typeof LIMIT_KEYS)[keyof typeof LIMIT_KEYS];
