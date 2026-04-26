/**
 * Человекочитаемые названия feature-кодов для UI.
 * Используется в PaywallModal, PaywallBanner, PlanCard и FeatureMatrix.
 *
 * Ключи — это значения FEATURE_CODES (строки, не имена ключей).
 */
export const FEATURE_LABELS: Record<string, string> = {
  // B2C профи-пакеты
  SMETCHIK_STUDIO_ACCESS: 'Сметчик-Студио',
  ID_MASTER_ACCESS: 'ИД-Мастер',
  PRORAB_JOURNAL_ACCESS: 'Прораб-Журнал',

  // B2B
  TEAM_MULTI_USER: 'Мультипользовательский доступ',
  CORPORATE_ISUP_INTEGRATION: 'Интеграция с ИСУП Минстроя',

  // AI / OCR
  AI_COMPLIANCE_CHECK: 'AI-проверка соответствия ГОСТ',
  AI_SMETA_IMPORT: 'AI-импорт смет',
  OCR_SCAN: 'Распознавание документов (OCR)',

  // Портал и доступ
  PUBLIC_DASHBOARD: 'Публичный дашборд проекта',
  GUEST_INVITATION: 'Приглашение гостей / заказчиков',

  // MODULE17 (будущие)
  CUSTOMER_HIDDEN_WORKS_CHECKLISTS: 'Чек-листы скрытых работ для заказчика',
  CUSTOMER_AI_LAWYER: 'AI-юрист для заказчика',
  CUSTOMER_CLAIM_TEMPLATES: 'Шаблоны претензий',
  MARKETPLACE_BOOST: 'Продвижение в маркетплейсе',

  // Сметы
  estimates: 'Сметы',
  estimates_import: 'Импорт смет (XML, Excel)',
  estimates_compare_basic: 'Сравнение версий смет',
  estimates_compare_advanced: 'Расширенное сравнение смет',
  estimates_export_grand_smeta: 'Экспорт в Гранд-Смета',
  estimates_public_link: 'Публичные ссылки на сметы',
  estimates_history: 'История изменений смет',
  fgis_cs_prices: 'Цены ФГИС ЦС',

  // ИД
  execution_docs: 'Исполнительная документация',
  aosr_generation: 'Генерация АОСР',
  ozr_generation: 'Генерация ОЖР',
  ks2_ks3_generation: 'КС-2 / КС-3',
  avk_atg_generation: 'АВК / АТГ',
  xml_minstroy_export: 'Экспорт для Минстроя',
  id_registry_auto: 'Автоматический реестр ИД',
  approval_routes: 'Маршруты согласования',

  // Журналы
  journals_basic: 'Журналы (базовые)',
  journals_full: 'Журналы (полные)',

  // Мобайл
  mobile_pwa: 'Мобильное приложение',
  mobile_offline: 'Офлайн-режим',
  voice_input: 'Голосовой ввод',

  // СК / Дефекты
  defects_lite: 'Учёт дефектов',
  defects_full: 'Полный модуль строительного контроля',
  photos_gps: 'Фото с геометкой GPS',
  photos_annotations: 'Аннотации на фото',
  geofencing: 'Геозоны',

  // Общие
  contracts_lite: 'Контракты (базовые)',
  contracts_full: 'Контракты (полные)',
  templates_library: 'Библиотека шаблонов',
  normative_library: 'Нормативная база (СНиП, ГОСТ)',
  view_only: 'Просмотр документов',
  comments: 'Комментарии',
  profile: 'Профиль',
};
