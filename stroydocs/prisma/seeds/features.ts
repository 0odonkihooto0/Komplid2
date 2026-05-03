import type { PrismaClient, FeatureCategory } from '@prisma/client';

interface FeatureDef {
  code: string;
  displayName: string;
  description?: string;
  category: FeatureCategory;
  isLimited?: boolean;
  defaultLimit?: number;
}

const FEATURES: FeatureDef[] = [
  // === CORE ===
  { code: 'view_only',         displayName: 'Просмотр объектов', category: 'CORE' },
  { code: 'comments',          displayName: 'Комментарии',        category: 'CORE' },
  { code: 'profile',           displayName: 'Профиль пользователя', category: 'CORE' },
  { code: 'GUEST_INVITATION',  displayName: 'Приглашение гостей', category: 'CORE', description: 'Возможность пригласить гостей в workspace' },
  { code: 'PUBLIC_DASHBOARD',  displayName: 'Публичный дашборд',  category: 'CORE', description: 'Публикация дашборда проекта по ссылке' },

  // === B2C_SMETCHIK ===
  { code: 'SMETCHIK_STUDIO_ACCESS', displayName: 'Доступ Сметчик-Студио', category: 'B2C_SMETCHIK', description: 'Полный доступ к пакету Сметчик-Студио' },
  { code: 'estimates',              displayName: 'Сметы',                  category: 'B2C_SMETCHIK' },
  { code: 'estimates_import',       displayName: 'Импорт смет',             category: 'B2C_SMETCHIK' },
  { code: 'estimates_compare_basic', displayName: 'Сравнение смет (базово)',  category: 'B2C_SMETCHIK' },
  { code: 'estimates_compare_advanced', displayName: 'Сравнение смет (расш.)', category: 'B2C_SMETCHIK' },
  { code: 'estimates_export_grand_smeta', displayName: 'Экспорт в Гранд-Смету', category: 'B2C_SMETCHIK' },
  { code: 'estimates_public_link',  displayName: 'Публичная ссылка на смету', category: 'B2C_SMETCHIK' },
  { code: 'estimates_history',      displayName: 'История изменений смет',   category: 'B2C_SMETCHIK' },
  { code: 'fgis_cs_prices',         displayName: 'Цены ФГИС ЦС',             category: 'B2C_SMETCHIK' },
  { code: 'contracts_lite',         displayName: 'Договоры (базово)',          category: 'B2C_SMETCHIK' },
  { code: 'contracts_full',         displayName: 'Договоры (полно)',           category: 'B2C_SMETCHIK' },
  { code: 'templates_library',      displayName: 'Библиотека шаблонов',        category: 'B2C_SMETCHIK' },
  { code: 'normative_library',      displayName: 'Нормативная база',           category: 'B2C_SMETCHIK' },

  // === B2C_PTO ===
  { code: 'ID_MASTER_ACCESS',  displayName: 'Доступ ИД-Мастер', category: 'B2C_PTO', description: 'Полный доступ к пакету ИД-Мастер' },
  { code: 'execution_docs',    displayName: 'Исполнительная документация', category: 'B2C_PTO' },
  { code: 'aosr_generation',   displayName: 'Генерация АОСР',  category: 'B2C_PTO' },
  { code: 'ozr_generation',    displayName: 'Генерация ОЖР',   category: 'B2C_PTO' },
  { code: 'ks2_ks3_generation', displayName: 'Генерация КС-2/КС-3', category: 'B2C_PTO' },
  { code: 'avk_atg_generation', displayName: 'Генерация АВК/АТГ',   category: 'B2C_PTO' },
  { code: 'xml_minstroy_export', displayName: 'Экспорт XML Минстрой', category: 'B2C_PTO' },
  { code: 'id_registry_auto',  displayName: 'Автоматический реестр ИД', category: 'B2C_PTO' },
  { code: 'approval_routes',   displayName: 'Маршруты согласования', category: 'B2C_PTO' },

  // === B2C_PRORAB ===
  { code: 'PRORAB_JOURNAL_ACCESS', displayName: 'Доступ Прораб-Журнал', category: 'B2C_PRORAB', description: 'Полный доступ к пакету Прораб-Журнал' },
  { code: 'journals_basic',  displayName: 'Журналы (базово)', category: 'B2C_PRORAB' },
  { code: 'journals_full',   displayName: 'Журналы (полно)',  category: 'B2C_PRORAB' },
  { code: 'defects_lite',    displayName: 'Дефекты (базово)', category: 'B2C_PRORAB' },
  { code: 'defects_full',    displayName: 'Дефекты (полно)',  category: 'B2C_PRORAB' },
  { code: 'photos_gps',      displayName: 'Геотеги на фото',  category: 'B2C_PRORAB' },
  { code: 'photos_annotations', displayName: 'Аннотации на фото', category: 'B2C_PRORAB' },
  { code: 'geofencing',      displayName: 'Геозоны',          category: 'B2C_PRORAB' },
  { code: 'mobile_pwa',      displayName: 'Мобильное приложение (PWA)', category: 'B2C_PRORAB' },
  { code: 'mobile_offline',  displayName: 'Офлайн-режим',     category: 'B2C_PRORAB' },
  { code: 'voice_input',     displayName: 'Голосовой ввод',   category: 'B2C_PRORAB' },

  // === B2C_CUSTOMER (MODULE17, Фаза 3) ===
  { code: 'CUSTOMER_HIDDEN_WORKS_CHECKLISTS', displayName: 'Чек-листы скрытых работ (для заказчика)', category: 'B2C_CUSTOMER', description: 'Доступ заказчика к чек-листам скрытых работ' },
  { code: 'CUSTOMER_AI_LAWYER',         displayName: 'AI-юрист для заказчика',        category: 'B2C_CUSTOMER', description: 'Консультации AI-юриста по строительному праву РФ' },
  { code: 'CUSTOMER_CLAIM_TEMPLATES',   displayName: 'Шаблоны претензий (заказчик)',  category: 'B2C_CUSTOMER' },
  { code: 'CUSTOMER_PAYMENT_TRACKER',   displayName: 'Трекер оплат ремонта',          category: 'B2C_CUSTOMER' },
  { code: 'CUSTOMER_MATERIALS_TRACKER', displayName: 'Трекер материалов ремонта',     category: 'B2C_CUSTOMER' },
  { code: 'CUSTOMER_UNLIMITED_PROJECTS', displayName: 'Неограниченное число проектов', category: 'B2C_CUSTOMER' },

  // === B2B ===
  { code: 'TEAM_MULTI_USER',          displayName: 'Мультипользовательский режим (Team)',     category: 'B2B', description: 'Несколько пользователей в одном workspace' },
  { code: 'CORPORATE_ISUP_INTEGRATION', displayName: 'Интеграция с ИСУП Минстроя (Corporate)', category: 'B2B' },

  // === AI ===
  { code: 'AI_SMETA_IMPORT',      displayName: 'AI-импорт смет',             category: 'AI' },
  { code: 'AI_COMPLIANCE_CHECK',  displayName: 'AI-проверка соответствия',   category: 'AI', isLimited: true, defaultLimit: 0 },
  { code: 'OCR_SCAN',             displayName: 'OCR-сканирование документов', category: 'AI', isLimited: true, defaultLimit: 0 },

  // === MARKETPLACE ===
  { code: 'MARKETPLACE_BOOST', displayName: 'Продвижение на маркетплейсе', category: 'MARKETPLACE' },
];

export async function seedSubscriptionFeatures(prisma: PrismaClient) {
  for (const feat of FEATURES) {
    await prisma.subscriptionFeature.upsert({
      where: { code: feat.code },
      create: {
        code: feat.code,
        displayName: feat.displayName,
        description: feat.description ?? null,
        category: feat.category,
        isLimited: feat.isLimited ?? false,
        defaultLimit: feat.defaultLimit ?? null,
      },
      update: {
        displayName: feat.displayName,
        description: feat.description ?? null,
        category: feat.category,
        isLimited: feat.isLimited ?? false,
        defaultLimit: feat.defaultLimit ?? null,
      },
    });
  }
  console.log(`Seeded ${FEATURES.length} subscription features`);
}
