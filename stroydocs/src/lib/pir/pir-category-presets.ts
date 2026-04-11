// Предустановленные категории ПИР по типам объектов (ЦУС стр. 96, ПП РФ №87)

export interface CategoryPreset {
  categoryCode: string;
  categoryName: string;
  parentCode: string | null;
  order: number;
}

export const PIR_CATEGORY_PRESETS: Record<string, CategoryPreset[]> = {
  'Объекты кап. строительства': [
    { categoryCode: 'I',    categoryName: 'I. Исходно-разрешительная документация (ИРД)', parentCode: null, order: 1 },
    { categoryCode: 'II',   categoryName: 'II. Проектная документация (ПД)', parentCode: null, order: 2 },
    { categoryCode: '1',    categoryName: '1. ПЗ — Пояснительная записка', parentCode: 'II', order: 10 },
    { categoryCode: '2',    categoryName: '2. ПЗУ — Схема планировочной организации', parentCode: 'II', order: 20 },
    { categoryCode: '2.1',  categoryName: '2.1. ДР — Придомовой кольцевой дренаж', parentCode: '2', order: 21 },
    { categoryCode: '3',    categoryName: '3. АР — Архитектурные решения', parentCode: 'II', order: 30 },
    { categoryCode: '4',    categoryName: '4. КР — Конструктивные и объёмно-планировочные решения', parentCode: 'II', order: 40 },
    { categoryCode: '5',    categoryName: '5. ИОС — Инженерные системы', parentCode: 'II', order: 50 },
    { categoryCode: '5.1',  categoryName: '5.1. ИОС1 — Электроснабжение', parentCode: '5', order: 51 },
    { categoryCode: '5.2',  categoryName: '5.2. ИОС2 — Система водоснабжения', parentCode: '5', order: 52 },
    { categoryCode: '5.3',  categoryName: '5.3. ИОС3 — Система водоотведения', parentCode: '5', order: 53 },
    { categoryCode: '5.4',  categoryName: '5.4. ИОС4 — Отопление, вентиляция, кондиционирование', parentCode: '5', order: 54 },
    { categoryCode: '5.5',  categoryName: '5.5. ИОС5 — Сети связи', parentCode: '5', order: 55 },
    { categoryCode: '5.6',  categoryName: '5.6. ИОС6 — Газоснабжение', parentCode: '5', order: 56 },
    { categoryCode: '5.7',  categoryName: '5.7. ИОС7 — Технологические решения', parentCode: '5', order: 57 },
    { categoryCode: '5.8',  categoryName: '5.8. ИОС8 — Холодное и горячее водоснабжение', parentCode: '5', order: 58 },
    { categoryCode: '5.9',  categoryName: '5.9. ИОС9 — Мусороудаление', parentCode: '5', order: 59 },
    { categoryCode: '5.11', categoryName: '5.11. ИОС11 — Иные сети', parentCode: '5', order: 60 },
    { categoryCode: '6',    categoryName: '6. ПОС — Проект организации строительства', parentCode: 'II', order: 70 },
    { categoryCode: '7',    categoryName: '7. ПОД — Проект организации демонтажа', parentCode: 'II', order: 80 },
    { categoryCode: '8',    categoryName: '8. ООС — Охрана окружающей среды', parentCode: 'II', order: 90 },
    { categoryCode: '9',    categoryName: '9. МПБ — Пожарная безопасность', parentCode: 'II', order: 100 },
    { categoryCode: '10',   categoryName: '10. МДИ — Доступность для инвалидов', parentCode: 'II', order: 110 },
    { categoryCode: '11',   categoryName: '11. СМИС — Система мониторинга', parentCode: 'II', order: 120 },
    { categoryCode: '12',   categoryName: '12. ЭЭ — Энергетическая эффективность', parentCode: 'II', order: 130 },
    { categoryCode: 'III',  categoryName: 'III. Рабочая документация (РД)', parentCode: null, order: 200 },
    { categoryCode: 'IV',   categoryName: 'IV. Результаты изысканий', parentCode: null, order: 300 },
  ],
  'Линейные объекты': [
    { categoryCode: 'I',   categoryName: 'I. Исходно-разрешительная документация (ИРД)', parentCode: null, order: 1 },
    { categoryCode: 'II',  categoryName: 'II. Проектная документация (ПД)', parentCode: null, order: 2 },
    { categoryCode: '1',   categoryName: '1. ПЗ — Пояснительная записка', parentCode: 'II', order: 10 },
    { categoryCode: '2',   categoryName: '2. ПЗУ — Схема планировочной организации', parentCode: 'II', order: 20 },
    { categoryCode: '3',   categoryName: '3. Технологические и конструктивные решения', parentCode: 'II', order: 30 },
    { categoryCode: '4',   categoryName: '4. ИОС — Инженерные системы', parentCode: 'II', order: 40 },
    { categoryCode: '5',   categoryName: '5. ПОС — Проект организации строительства', parentCode: 'II', order: 50 },
    { categoryCode: '6',   categoryName: '6. ООС — Охрана окружающей среды', parentCode: 'II', order: 60 },
    { categoryCode: '7',   categoryName: '7. МПБ — Пожарная безопасность', parentCode: 'II', order: 70 },
    { categoryCode: '8',   categoryName: '8. СМ — Смета', parentCode: 'II', order: 80 },
    { categoryCode: 'III', categoryName: 'III. Рабочая документация (РД)', parentCode: null, order: 200 },
    { categoryCode: 'IV',  categoryName: 'IV. Результаты изысканий', parentCode: null, order: 300 },
  ],
  'Уникальные объекты': [
    { categoryCode: 'I',   categoryName: 'I. Исходно-разрешительная документация (ИРД)', parentCode: null, order: 1 },
    { categoryCode: 'II',  categoryName: 'II. Проектная документация (ПД)', parentCode: null, order: 2 },
    { categoryCode: '1',   categoryName: '1. ПЗ — Пояснительная записка', parentCode: 'II', order: 10 },
    { categoryCode: '2',   categoryName: '2. ПЗУ — Схема планировочной организации', parentCode: 'II', order: 20 },
    { categoryCode: '3',   categoryName: '3. АР — Архитектурные решения', parentCode: 'II', order: 30 },
    { categoryCode: '4',   categoryName: '4. КР — Конструктивные решения', parentCode: 'II', order: 40 },
    { categoryCode: '5',   categoryName: '5. ИОС — Инженерные системы', parentCode: 'II', order: 50 },
    { categoryCode: '6',   categoryName: '6. ПОС — Организация строительства', parentCode: 'II', order: 60 },
    { categoryCode: '11',  categoryName: '11. СМИС — Мониторинг несущих конструкций', parentCode: 'II', order: 70 },
    { categoryCode: 'III', categoryName: 'III. Рабочая документация (РД)', parentCode: null, order: 200 },
    { categoryCode: 'IV',  categoryName: 'IV. Результаты изысканий', parentCode: null, order: 300 },
  ],
};

export const PIR_OBJECT_TYPES = Object.keys(PIR_CATEGORY_PRESETS);
