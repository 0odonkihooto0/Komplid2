import type { PrismaClient } from '@prisma/client';

interface PlanFeatureDef {
  planCode: string;
  featureCode: string;
  included: boolean;
  limit?: number;
}

// Связки план ↔ фича согласно AUTH_ONBOARDING_ROLES_PLAN A2.3
const PLAN_FEATURE_MAP: PlanFeatureDef[] = [
  // ─── Free ────────────────────────────────────────────────────────────────
  { planCode: 'free', featureCode: 'view_only',   included: true },
  { planCode: 'free', featureCode: 'comments',    included: true },
  { planCode: 'free', featureCode: 'profile',     included: true },

  // ─── Сметчик-Студио Базовый ──────────────────────────────────────────────
  { planCode: 'smetchik_studio_basic', featureCode: 'SMETCHIK_STUDIO_ACCESS', included: true },
  { planCode: 'smetchik_studio_basic', featureCode: 'AI_SMETA_IMPORT',         included: true },
  { planCode: 'smetchik_studio_basic', featureCode: 'estimates',               included: true },
  { planCode: 'smetchik_studio_basic', featureCode: 'estimates_import',        included: true },
  { planCode: 'smetchik_studio_basic', featureCode: 'estimates_compare_basic', included: true },
  { planCode: 'smetchik_studio_basic', featureCode: 'contracts_lite',          included: true },
  { planCode: 'smetchik_studio_basic', featureCode: 'templates_library',       included: true },
  { planCode: 'smetchik_studio_basic', featureCode: 'normative_library',       included: true },

  // ─── Сметчик-Студио Про ──────────────────────────────────────────────────
  { planCode: 'smetchik_studio_pro', featureCode: 'SMETCHIK_STUDIO_ACCESS',          included: true },
  { planCode: 'smetchik_studio_pro', featureCode: 'AI_SMETA_IMPORT',                 included: true },
  { planCode: 'smetchik_studio_pro', featureCode: 'estimates',                        included: true },
  { planCode: 'smetchik_studio_pro', featureCode: 'estimates_import',                 included: true },
  { planCode: 'smetchik_studio_pro', featureCode: 'estimates_compare_basic',          included: true },
  { planCode: 'smetchik_studio_pro', featureCode: 'estimates_compare_advanced',       included: true },
  { planCode: 'smetchik_studio_pro', featureCode: 'estimates_export_grand_smeta',     included: true },
  { planCode: 'smetchik_studio_pro', featureCode: 'estimates_public_link',            included: true },
  { planCode: 'smetchik_studio_pro', featureCode: 'estimates_history',                included: true },
  { planCode: 'smetchik_studio_pro', featureCode: 'fgis_cs_prices',                   included: true },
  { planCode: 'smetchik_studio_pro', featureCode: 'contracts_full',                   included: true },
  { planCode: 'smetchik_studio_pro', featureCode: 'templates_library',                included: true },
  { planCode: 'smetchik_studio_pro', featureCode: 'normative_library',                included: true },
  { planCode: 'smetchik_studio_pro', featureCode: 'AI_COMPLIANCE_CHECK',              included: true, limit: 20 },
  { planCode: 'smetchik_studio_pro', featureCode: 'OCR_SCAN',                         included: true, limit: 20 },

  // ─── ИД-Мастер Базовый ──────────────────────────────────────────────────
  { planCode: 'id_master_basic', featureCode: 'ID_MASTER_ACCESS',  included: true },
  { planCode: 'id_master_basic', featureCode: 'execution_docs',    included: true },
  { planCode: 'id_master_basic', featureCode: 'aosr_generation',   included: true },
  { planCode: 'id_master_basic', featureCode: 'ozr_generation',    included: true },
  { planCode: 'id_master_basic', featureCode: 'ks2_ks3_generation', included: true },
  { planCode: 'id_master_basic', featureCode: 'id_registry_auto',  included: true },
  { planCode: 'id_master_basic', featureCode: 'approval_routes',   included: true },
  { planCode: 'id_master_basic', featureCode: 'AI_COMPLIANCE_CHECK', included: true, limit: 5 },
  { planCode: 'id_master_basic', featureCode: 'OCR_SCAN',           included: true, limit: 5 },
  { planCode: 'id_master_basic', featureCode: 'templates_library',  included: true },

  // ─── ИД-Мастер Про ──────────────────────────────────────────────────────
  { planCode: 'id_master_pro', featureCode: 'ID_MASTER_ACCESS',    included: true },
  { planCode: 'id_master_pro', featureCode: 'execution_docs',      included: true },
  { planCode: 'id_master_pro', featureCode: 'aosr_generation',     included: true },
  { planCode: 'id_master_pro', featureCode: 'ozr_generation',      included: true },
  { planCode: 'id_master_pro', featureCode: 'ks2_ks3_generation',  included: true },
  { planCode: 'id_master_pro', featureCode: 'avk_atg_generation',  included: true },
  { planCode: 'id_master_pro', featureCode: 'xml_minstroy_export', included: true },
  { planCode: 'id_master_pro', featureCode: 'id_registry_auto',    included: true },
  { planCode: 'id_master_pro', featureCode: 'approval_routes',     included: true },
  { planCode: 'id_master_pro', featureCode: 'AI_COMPLIANCE_CHECK', included: true },
  { planCode: 'id_master_pro', featureCode: 'OCR_SCAN',            included: true },
  { planCode: 'id_master_pro', featureCode: 'templates_library',   included: true },
  { planCode: 'id_master_pro', featureCode: 'normative_library',   included: true },

  // ─── Прораб-Журнал Базовый ──────────────────────────────────────────────
  { planCode: 'foreman_journal_basic', featureCode: 'PRORAB_JOURNAL_ACCESS', included: true },
  { planCode: 'foreman_journal_basic', featureCode: 'journals_basic',         included: true },
  { planCode: 'foreman_journal_basic', featureCode: 'defects_lite',           included: true },
  { planCode: 'foreman_journal_basic', featureCode: 'photos_gps',             included: true },
  { planCode: 'foreman_journal_basic', featureCode: 'mobile_pwa',             included: true },

  // ─── Прораб-Журнал Про ──────────────────────────────────────────────────
  { planCode: 'foreman_journal_pro', featureCode: 'PRORAB_JOURNAL_ACCESS',  included: true },
  { planCode: 'foreman_journal_pro', featureCode: 'journals_full',           included: true },
  { planCode: 'foreman_journal_pro', featureCode: 'defects_full',            included: true },
  { planCode: 'foreman_journal_pro', featureCode: 'photos_gps',              included: true },
  { planCode: 'foreman_journal_pro', featureCode: 'photos_annotations',      included: true },
  { planCode: 'foreman_journal_pro', featureCode: 'geofencing',              included: true },
  { planCode: 'foreman_journal_pro', featureCode: 'mobile_pwa',              included: true },
  { planCode: 'foreman_journal_pro', featureCode: 'mobile_offline',          included: true },
  { planCode: 'foreman_journal_pro', featureCode: 'voice_input',             included: true },
  { planCode: 'foreman_journal_pro', featureCode: 'GUEST_INVITATION',        included: true },

  // ─── Мой Ремонт Бесплатный ──────────────────────────────────────────────
  { planCode: 'customer_free', featureCode: 'CUSTOMER_HIDDEN_WORKS_CHECKLISTS', included: true },
  { planCode: 'customer_free', featureCode: 'CUSTOMER_CLAIM_TEMPLATES',          included: true },

  // ─── Мой Ремонт Pro ──────────────────────────────────────────────────────
  { planCode: 'customer_pro', featureCode: 'CUSTOMER_HIDDEN_WORKS_CHECKLISTS', included: true },
  { planCode: 'customer_pro', featureCode: 'CUSTOMER_AI_LAWYER',               included: true },
  { planCode: 'customer_pro', featureCode: 'CUSTOMER_CLAIM_TEMPLATES',         included: true },
  { planCode: 'customer_pro', featureCode: 'CUSTOMER_PAYMENT_TRACKER',         included: true },
  { planCode: 'customer_pro', featureCode: 'CUSTOMER_MATERIALS_TRACKER',       included: true },
  { planCode: 'customer_pro', featureCode: 'CUSTOMER_UNLIMITED_PROJECTS',      included: true },
];

export async function seedPlanFeatures(prisma: PrismaClient) {
  let seeded = 0;
  let skipped = 0;

  for (const def of PLAN_FEATURE_MAP) {
    // Находим план и фичу по кодам
    const plan = await prisma.subscriptionPlan.findUnique({ where: { code: def.planCode } });
    if (!plan) {
      console.warn(`[plan-features] план "${def.planCode}" не найден — пропускаем`);
      skipped++;
      continue;
    }

    const feature = await prisma.subscriptionFeature.findUnique({ where: { code: def.featureCode } });
    if (!feature) {
      console.warn(`[plan-features] фича "${def.featureCode}" не найдена — пропускаем`);
      skipped++;
      continue;
    }

    await prisma.planFeature.upsert({
      where: { planId_featureId: { planId: plan.id, featureId: feature.id } },
      create: {
        planId: plan.id,
        featureId: feature.id,
        included: def.included,
        limit: def.limit ?? null,
      },
      update: {
        included: def.included,
        limit: def.limit ?? null,
      },
    });
    seeded++;
  }

  console.log(`Seeded ${seeded} plan-feature links (skipped ${skipped})`);
}
