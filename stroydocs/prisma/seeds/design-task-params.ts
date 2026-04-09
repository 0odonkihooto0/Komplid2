/**
 * Предустановленные параметры заданий на ПИР
 * Раздел 1–10: 95 параметров для задания на проектирование (ЗП)
 * Раздел 11: 15 параметров для задания на изыскания (ЗИ)
 *
 * Соответствуют требованиям ГОСТ Р 70108-2025 и ЦУС Минстроя РФ
 */

export interface DesignParamTemplate {
  key: string
  name: string
  order: number
}

// ─────────────────────────────────────────────
// 95 параметров задания на проектирование (ЗП)
// ─────────────────────────────────────────────
export const DESIGN_PARAMS: DesignParamTemplate[] = [
  // Раздел 1: Общие данные об объекте
  { key: 'object_name',              name: 'Наименование объекта капитального строительства', order: 1 },
  { key: 'object_address',           name: 'Адрес объекта (местоположение)', order: 2 },
  { key: 'build_type',               name: 'Вид строительства (новое / реконструкция / кап. ремонт)', order: 3 },
  { key: 'purpose',                  name: 'Функциональное назначение объекта', order: 4 },
  { key: 'capacity',                 name: 'Мощность / вместимость / производительность', order: 5 },
  { key: 'total_area',               name: 'Общая площадь объекта (м²)', order: 6 },
  { key: 'floors_above',             name: 'Количество надземных этажей', order: 7 },
  { key: 'floors_below',             name: 'Количество подземных этажей', order: 8 },
  { key: 'responsibility_class',     name: 'Уровень ответственности (КС-1 / КС-2 / КС-3)', order: 9 },
  { key: 'fire_resistance_class',    name: 'Степень огнестойкости здания', order: 10 },

  // Раздел 2: Требования к стадийности и разделам
  { key: 'stages',                   name: 'Стадийность проектирования (ПД, РД, ПД+РД)', order: 11 },
  { key: 'sections_pd',              name: 'Разделы проектной документации (по ПП РФ №87)', order: 12 },
  { key: 'sections_rd',              name: 'Разделы рабочей документации', order: 13 },
  { key: 'ntd_list',                 name: 'Перечень НТД (СП, ГОСТ, СНиП)', order: 14 },
  { key: 'special_conditions',       name: 'Особые условия строительства', order: 15 },
  { key: 'bim_required',             name: 'Требование по разработке ТИМ-модели (BIM)', order: 16 },
  { key: 'bim_level',                name: 'Уровень разработки ТИМ-модели (LOD)', order: 17 },

  // Раздел 3: Требования к архитектурно-планировочным решениям
  { key: 'architectural_style',      name: 'Архитектурный стиль / концептуальные требования', order: 18 },
  { key: 'facade_materials',         name: 'Требования к фасадным материалам', order: 19 },
  { key: 'color_scheme',             name: 'Цветовое решение фасадов', order: 20 },
  { key: 'accessibility',            name: 'Требования МГН (маломобильные группы населения)', order: 21 },
  { key: 'parking',                  name: 'Требования к парковке (количество машиномест)', order: 22 },
  { key: 'landscaping',              name: 'Требования к благоустройству территории', order: 23 },

  // Раздел 4: Конструктивные решения
  { key: 'structural_scheme',        name: 'Конструктивная схема здания', order: 24 },
  { key: 'foundation_type',          name: 'Тип фундамента (рекомендуемый)', order: 25 },
  { key: 'load_bearing_materials',   name: 'Материал несущих конструкций', order: 26 },
  { key: 'floor_type',               name: 'Тип перекрытий', order: 27 },
  { key: 'roof_type',                name: 'Тип кровли', order: 28 },
  { key: 'seismic_zone',             name: 'Сейсмичность района строительства (баллы)', order: 29 },
  { key: 'snow_region',              name: 'Снеговой район', order: 30 },
  { key: 'wind_region',              name: 'Ветровой район', order: 31 },

  // Раздел 5: Инженерные системы
  { key: 'heating_type',             name: 'Тип системы отопления', order: 32 },
  { key: 'ventilation_type',         name: 'Тип системы вентиляции и кондиционирования', order: 33 },
  { key: 'water_supply_source',      name: 'Источник водоснабжения', order: 34 },
  { key: 'sewage_type',              name: 'Тип канализации', order: 35 },
  { key: 'power_supply_category',    name: 'Категория надёжности электроснабжения', order: 36 },
  { key: 'power_load',               name: 'Ориентировочная расчётная нагрузка (кВт)', order: 37 },
  { key: 'gas_supply',               name: 'Требования к газоснабжению', order: 38 },
  { key: 'fire_alarm',               name: 'Тип пожарной сигнализации', order: 39 },
  { key: 'fire_suppression',         name: 'Система пожаротушения', order: 40 },
  { key: 'security_system',          name: 'Системы безопасности и охраны', order: 41 },
  { key: 'automation',               name: 'Требования к автоматизации (АСУТП, BMS)', order: 42 },
  { key: 'elevator',                 name: 'Лифты (количество, грузоподъёмность)', order: 43 },

  // Раздел 6: Технологические решения
  { key: 'technology_requirements',  name: 'Технологические требования к помещениям', order: 44 },
  { key: 'equipment_list',           name: 'Основное технологическое оборудование', order: 45 },
  { key: 'production_process',       name: 'Описание производственного процесса', order: 46 },
  { key: 'sanitary_zones',           name: 'Санитарно-защитные зоны', order: 47 },
  { key: 'explosion_proof',          name: 'Требования к взрывопожарозащите', order: 48 },

  // Раздел 7: Требования к организации строительства
  { key: 'construction_schedule',    name: 'Планируемые сроки строительства', order: 49 },
  { key: 'construction_phases',      name: 'Очерёдность строительства (этапы)', order: 50 },
  { key: 'ppos_requirements',        name: 'Требования к ПОС (проект организации строительства)', order: 51 },
  { key: 'site_access',              name: 'Ограничения по доступу на площадку', order: 52 },
  { key: 'demolition',               name: 'Требования по сносу / разборке существующих строений', order: 53 },
  { key: 'existing_utilities',       name: 'Существующие инженерные сети (по данным заказчика)', order: 54 },

  // Раздел 8: Экология и охрана окружающей среды
  { key: 'environmental_impact',     name: 'Оценка воздействия на окружающую среду (ОВОС)', order: 55 },
  { key: 'water_protection_zone',    name: 'Водоохранная зона / прибрежная полоса', order: 56 },
  { key: 'protected_areas',          name: 'Особо охраняемые природные территории', order: 57 },
  { key: 'cultural_heritage',        name: 'Объекты культурного наследия (охранные зоны)', order: 58 },
  { key: 'waste_management',         name: 'Обращение с отходами строительства', order: 59 },

  // Раздел 9: Согласования и разрешительная документация
  { key: 'permit_required',          name: 'Разрешение на строительство (требуется / нет)', order: 60 },
  { key: 'state_expertise',          name: 'Необходимость государственной экспертизы', order: 61 },
  { key: 'expertise_type',           name: 'Тип экспертизы (государственная / негосударственная)', order: 62 },
  { key: 'technical_conditions',     name: 'Полученные технические условия (ТУ) на подключение', order: 63 },
  { key: 'rosreestr',                name: 'Требования по постановке на кадастровый учёт', order: 64 },

  // Раздел 10: Стоимость и сметная документация
  { key: 'estimate_base',            name: 'Сметно-нормативная база (ФЕР / ТЕР / ГЭСН)', order: 65 },
  { key: 'index_on_date',            name: 'Индекс пересчёта на дату (квартал, год)', order: 66 },
  { key: 'budget_limit',             name: 'Ориентировочная стоимость строительства (лимит)', order: 67 },
  { key: 'funding_source',           name: 'Источник финансирования', order: 68 },
  { key: 'vat_included',             name: 'Учёт НДС в сметной стоимости', order: 69 },

  // Раздел 11: Технические условия от поставщиков
  { key: 'tu_electricity',           name: 'ТУ на электроснабжение', order: 70 },
  { key: 'tu_water',                 name: 'ТУ на водоснабжение', order: 71 },
  { key: 'tu_sewage',                name: 'ТУ на канализацию', order: 72 },
  { key: 'tu_heat',                  name: 'ТУ на теплоснабжение', order: 73 },
  { key: 'tu_gas',                   name: 'ТУ на газоснабжение', order: 74 },
  { key: 'tu_telecom',               name: 'ТУ на телекоммуникации и интернет', order: 75 },

  // Раздел 12: Документация по участку
  { key: 'cadastral_number',         name: 'Кадастровый номер земельного участка', order: 76 },
  { key: 'land_category',            name: 'Категория земли и вид разрешённого использования', order: 77 },
  { key: 'land_area',                name: 'Площадь земельного участка (га)', order: 78 },
  { key: 'topography_data',          name: 'Топографо-геодезические данные (наличие / требуется)', order: 79 },
  { key: 'gpzu',                     name: 'ГПЗУ (градостроительный план земельного участка)', order: 80 },
  { key: 'red_lines',                name: 'Красные линии и ограничения по ГПЗУ', order: 81 },

  // Раздел 13: Изыскания (требования к составу)
  { key: 'engineering_surveys',      name: 'Состав инженерных изысканий (геология, геодезия, экология)', order: 82 },
  { key: 'soil_report',              name: 'Отчёт об инженерно-геологических изысканиях (наличие)', order: 83 },
  { key: 'geodetic_report',          name: 'Отчёт об инженерно-геодезических изысканиях (наличие)', order: 84 },
  { key: 'hydrological_report',      name: 'Отчёт о гидрологических изысканиях (при необходимости)', order: 85 },

  // Раздел 14: Требования к документооборот
  { key: 'doc_format',               name: 'Формат предоставления документации (pdf / dwg / ifc)', order: 86 },
  { key: 'stamp_requirements',       name: 'Требования к штампу проектной организации', order: 87 },
  { key: 'digital_signature',        name: 'Требование к ЭЦП на документах', order: 88 },
  { key: 'copies_count',             name: 'Количество экземпляров документации', order: 89 },
  { key: 'language',                 name: 'Язык документации', order: 90 },

  // Раздел 15: Прочее
  { key: 'energy_efficiency_class',  name: 'Класс энергетической эффективности здания', order: 91 },
  { key: 'smart_metering',           name: 'Требование к интеллектуальным системам учёта (АСКУЭ)', order: 92 },
  { key: 'accessibility_audit',      name: 'Независимая оценка доступности для МГН', order: 93 },
  { key: 'additional_requirements',  name: 'Дополнительные требования заказчика', order: 94 },
  { key: 'notes',                    name: 'Примечания и особые указания', order: 95 },
]

// ─────────────────────────────────────────────
// 15 параметров задания на изыскания (ЗИ)
// ─────────────────────────────────────────────
export const SURVEY_PARAMS: DesignParamTemplate[] = [
  { key: 'survey_types',             name: 'Виды инженерных изысканий (геология, геодезия, экология, гидрология)', order: 1 },
  { key: 'survey_area',              name: 'Площадь и границы территории изысканий', order: 2 },
  { key: 'survey_purpose',           name: 'Цель изысканий (для ПД / для РД / для строительства)', order: 3 },
  { key: 'drilling_depth',           name: 'Глубина бурения скважин (м)', order: 4 },
  { key: 'drilling_count',           name: 'Ориентировочное количество скважин', order: 5 },
  { key: 'lab_tests',                name: 'Лабораторные испытания грунтов (перечень)', order: 6 },
  { key: 'geodetic_accuracy',        name: 'Точность геодезических работ (масштаб, погрешность)', order: 7 },
  { key: 'geodetic_system',          name: 'Система координат и высот', order: 8 },
  { key: 'environmental_sampling',   name: 'Экологические пробы (почва, вода, воздух)', order: 9 },
  { key: 'hydrogeology',             name: 'Гидрогеологические условия (уровень грунтовых вод)', order: 10 },
  { key: 'seismic_microzonation',    name: 'Сейсмическое микрорайонирование (при необходимости)', order: 11 },
  { key: 'survey_report_format',     name: 'Формат отчётов и состав изыскательской документации', order: 12 },
  { key: 'survey_deadlines',         name: 'Срок выполнения изысканий', order: 13 },
  { key: 'survey_organization',      name: 'Требования к изыскательской организации (СРО)', order: 14 },
  { key: 'survey_notes',             name: 'Дополнительные требования к изысканиям', order: 15 },
]
