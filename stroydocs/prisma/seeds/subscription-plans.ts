import type { PrismaClient } from '@prisma/client';

export const PHASE_1_PLANS = [
  // ============ FREE ============
  {
    code: 'free',
    name: 'Бесплатный',
    planType: 'FREE' as const,
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
    planType: 'SOLO_BASIC' as const,
    targetRole: 'SMETCHIK' as const,
    priceMonthlyRub: 190000,
    priceYearlyRub: 1824000,
    requiresPersonalWorkspace: true,
    features: [
      'estimates',
      'estimates_import',
      'estimates_compare_basic',
      'contracts_lite',
      'templates_library',
      'normative_library',
    ],
    limits: { maxActiveEstimates: 5, maxStorageGB: 1, maxGuests: 3, maxObjects: 2 },
    displayOrder: 10,
  },
  {
    code: 'smetchik_studio_pro',
    name: 'Сметчик-Студио Pro',
    planType: 'SOLO_PRO' as const,
    targetRole: 'SMETCHIK' as const,
    priceMonthlyRub: 290000,
    priceYearlyRub: 2784000,
    requiresPersonalWorkspace: true,
    isFeatured: true,
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
    limits: { maxActiveEstimates: -1, maxStorageGB: 10, maxGuests: 10, maxObjects: 5 },
    displayOrder: 11,
  },

  // ============ ИД-МАСТЕР ============
  {
    code: 'id_master_basic',
    name: 'ИД-Мастер Базовый',
    planType: 'SOLO_BASIC' as const,
    targetRole: 'PTO' as const,
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
    limits: { maxDocumentsPerMonth: 50, maxStorageGB: 5, maxGuests: 3, maxObjects: 1 },
    displayOrder: 20,
  },
  {
    code: 'id_master_pro',
    name: 'ИД-Мастер Pro',
    planType: 'SOLO_PRO' as const,
    targetRole: 'PTO' as const,
    priceMonthlyRub: 290000,
    priceYearlyRub: 2784000,
    requiresPersonalWorkspace: true,
    isFeatured: true,
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
    limits: { maxDocumentsPerMonth: -1, maxStorageGB: 25, maxGuests: 10, maxObjects: 5 },
    displayOrder: 21,
  },

  // ============ ПРОРАБ-ЖУРНАЛ ============
  {
    code: 'foreman_journal_basic',
    name: 'Прораб-Журнал Базовый',
    planType: 'SOLO_BASIC' as const,
    targetRole: 'FOREMAN' as const,
    priceMonthlyRub: 190000,
    priceYearlyRub: 1824000,
    requiresPersonalWorkspace: true,
    features: ['journals_basic', 'mobile_pwa', 'photos_gps', 'defects_lite'],
    limits: { maxObjects: 1, maxStorageGB: 5, maxPhotosPerMonth: 500, maxGuests: 2 },
    displayOrder: 30,
  },
  {
    code: 'foreman_journal_pro',
    name: 'Прораб-Журнал Pro',
    planType: 'SOLO_PRO' as const,
    targetRole: 'FOREMAN' as const,
    priceMonthlyRub: 290000,
    priceYearlyRub: 2784000,
    requiresPersonalWorkspace: true,
    isFeatured: true,
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
    limits: { maxObjects: 5, maxStorageGB: 25, maxPhotosPerMonth: -1, maxGuests: 10 },
    displayOrder: 31,
  },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export async function seedSubscriptionPlans(prisma: PrismaClient) {
  for (const plan of PHASE_1_PLANS) {
    const data: AnyRecord = {
      ...plan,
      features: [...plan.features],
    };
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      create: data as AnyRecord,
      update: data as AnyRecord,
    });
  }
  console.log(`Seeded ${PHASE_1_PLANS.length} subscription plans`);
}
