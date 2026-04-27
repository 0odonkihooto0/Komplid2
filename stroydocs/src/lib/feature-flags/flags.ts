// Реестр известных runtime feature-flag ключей.
// Это не подписочные фичи (FEATURE_CODES) — только флаги для A/B-тестов и rollout.
export const FLAG_KEYS = {
  NEW_AI_COMPLIANCE_UI: 'new_ai_compliance_ui',
  BETA_DASHBOARD_V2: 'beta_dashboard_v2',
  ENABLE_OCR_BATCH: 'enable_ocr_batch',
  NEW_ONBOARDING_FLOW: 'new_onboarding_flow',
  ENABLE_CHAT_V2: 'enable_chat_v2',
} as const;

export type FlagKey = (typeof FLAG_KEYS)[keyof typeof FLAG_KEYS];

export interface FeatureFlagAudiences {
  workspaceIds?: string[];
  userIds?: string[];
  intents?: string[];
}
