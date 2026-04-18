import { PrismaClient } from '@prisma/client';

// ─── Валюты (ISO 4217) ────────────────────────────────────────────────────────
const CURRENCIES = [
  {
    name: 'Рубль',
    shortName: 'RUB',
    shortSymbol: '₽',
    fullName: 'Российский рубль',
    englishName: 'Russian Ruble',
    caseForm: 'рубля / рублей',
    code: 'RUB',
    numericCode: '643',
  },
  {
    name: 'Доллар США',
    shortName: 'USD',
    shortSymbol: '$',
    fullName: 'Доллар Соединённых Штатов Америки',
    englishName: 'US Dollar',
    caseForm: 'доллара / долларов',
    code: 'USD',
    numericCode: '840',
  },
  {
    name: 'Евро',
    shortName: 'EUR',
    shortSymbol: '€',
    fullName: 'Евро',
    englishName: 'Euro',
    caseForm: 'евро / евро',
    code: 'EUR',
    numericCode: '978',
  },
  {
    name: 'Юань',
    shortName: 'CNY',
    shortSymbol: '¥',
    fullName: 'Китайский юань',
    englishName: 'Chinese Yuan Renminbi',
    caseForm: 'юаня / юаней',
    code: 'CNY',
    numericCode: '156',
  },
  {
    name: 'Иена',
    shortName: 'JPY',
    shortSymbol: '¥',
    fullName: 'Японская иена',
    englishName: 'Japanese Yen',
    caseForm: 'иены / иен',
    code: 'JPY',
    numericCode: '392',
  },
  {
    name: 'Фунт стерлингов',
    shortName: 'GBP',
    shortSymbol: '£',
    fullName: 'Фунт стерлингов Великобритании',
    englishName: 'Pound Sterling',
    caseForm: 'фунта / фунтов',
    code: 'GBP',
    numericCode: '826',
  },
  {
    name: 'Швейцарский франк',
    shortName: 'CHF',
    shortSymbol: 'Fr',
    fullName: 'Швейцарский франк',
    englishName: 'Swiss Franc',
    caseForm: 'франка / франков',
    code: 'CHF',
    numericCode: '756',
  },
  {
    name: 'Тенге',
    shortName: 'KZT',
    shortSymbol: '₸',
    fullName: 'Казахстанский тенге',
    englishName: 'Tenge',
    caseForm: 'тенге / тенге',
    code: 'KZT',
    numericCode: '398',
  },
  {
    name: 'Белорусский рубль',
    shortName: 'BYN',
    shortSymbol: 'Br',
    fullName: 'Белорусский рубль',
    englishName: 'Belarusian Ruble',
    caseForm: 'рубля / рублей',
    code: 'BYN',
    numericCode: '933',
  },
] as const;

// ─── Типы бюджета ──────────────────────────────────────────────────────────────
const BUDGET_TYPES = [
  { name: 'Федеральный бюджет',          code: 'FED',             color: '#1D4ED8', order: 0 },
  { name: 'Региональный бюджет',         code: 'REG',             color: '#0891B2', order: 1 },
  { name: 'Местный бюджет',              code: 'LOC',             color: '#059669', order: 2 },
  { name: 'Собственные средства',        code: 'OWN',             color: '#7C3AED', order: 3 },
  { name: 'Заёмные средства (кредит)',   code: 'CREDIT',          color: '#D97706', order: 4 },
  { name: 'Средства старшего кредитора', code: 'SENIOR_CREDITOR', color: '#DC2626', order: 5 },
] as const;

// ─── Единицы измерения (ГОСТ 8.417-2002 / ОКЕИ) ───────────────────────────────
const MEASUREMENT_UNITS = [
  // Длина
  { name: 'метр',              shortName: 'м',        ruCode: '006', intCode: 'm',   category: 'Длина' },
  { name: 'сантиметр',         shortName: 'см',       ruCode: '004', intCode: 'cm',  category: 'Длина' },
  { name: 'миллиметр',         shortName: 'мм',       ruCode: '003', intCode: 'mm',  category: 'Длина' },
  { name: 'километр',          shortName: 'км',       ruCode: '008', intCode: 'km',  category: 'Длина' },
  { name: 'погонный метр',     shortName: 'пм',       ruCode: '018', intCode: null,  category: 'Длина' },
  // Площадь
  { name: 'квадратный метр',   shortName: 'м²',       ruCode: '055', intCode: 'm²', category: 'Площадь' },
  { name: 'гектар',            shortName: 'га',       ruCode: '059', intCode: 'ha',  category: 'Площадь' },
  // Объём
  { name: 'кубический метр',   shortName: 'м³',       ruCode: '113', intCode: 'm³', category: 'Объём' },
  { name: 'литр',              shortName: 'л',        ruCode: '112', intCode: 'L',   category: 'Объём' },
  { name: 'кубометр насыпной', shortName: 'м³ нас.',  ruCode: null,  intCode: null,  category: 'Объём' },
  // Масса
  { name: 'килограмм',         shortName: 'кг',       ruCode: '166', intCode: 'kg',  category: 'Масса' },
  { name: 'тонна',             shortName: 'т',        ruCode: '168', intCode: 't',   category: 'Масса' },
  { name: 'грамм',             shortName: 'г',        ruCode: '163', intCode: 'g',   category: 'Масса' },
  // Количество
  { name: 'штука',             shortName: 'шт.',      ruCode: '796', intCode: 'pcs', category: 'Количество' },
  { name: 'комплект',          shortName: 'компл.',   ruCode: '839', intCode: 'set', category: 'Количество' },
  { name: 'упаковка',          shortName: 'упак.',    ruCode: '778', intCode: 'pkg', category: 'Количество' },
  { name: 'рулон',             shortName: 'рул.',     ruCode: '682', intCode: null,  category: 'Количество' },
  { name: 'лист',              shortName: 'л.',       ruCode: '625', intCode: null,  category: 'Количество' },
  { name: 'мешок',             shortName: 'меш.',     ruCode: '736', intCode: null,  category: 'Количество' },
  // Время
  { name: 'час',               shortName: 'ч',        ruCode: '356', intCode: 'h',   category: 'Время' },
  { name: 'сутки',             shortName: 'сут.',     ruCode: '359', intCode: 'd',   category: 'Время' },
  // Энергия / Мощность
  { name: 'киловатт-час',      shortName: 'кВт·ч',    ruCode: '245', intCode: 'kWh', category: 'Энергия' },
  { name: 'килоВатт',          shortName: 'кВт',      ruCode: '214', intCode: 'kW',  category: 'Мощность' },
  // Строительные специфичные
  { name: 'машино-смена',      shortName: 'маш.-см.', ruCode: '505', intCode: null,  category: 'Работа техники' },
  { name: 'человеко-час',      shortName: 'чел.-ч.',  ruCode: '539', intCode: null,  category: 'Труд' },
] as const;

// ─── Падежи русского языка ─────────────────────────────────────────────────────
const DECLENSION_CASES = [
  { name: 'Именительный', shortName: 'И.п.', order: 0 },
  { name: 'Родительный',  shortName: 'Р.п.', order: 1 },
  { name: 'Дательный',    shortName: 'Д.п.', order: 2 },
  { name: 'Винительный',  shortName: 'В.п.', order: 3 },
  { name: 'Творительный', shortName: 'Т.п.', order: 4 },
  { name: 'Предложный',   shortName: 'П.п.', order: 5 },
] as const;

export async function seedCurrencies(prisma: PrismaClient): Promise<void> {
  console.log('Загрузка справочника валют (ISO 4217)...');
  for (const c of CURRENCIES) {
    await prisma.currency.upsert({
      where: { code: c.code },
      update: {
        name: c.name,
        shortName: c.shortName,
        shortSymbol: c.shortSymbol,
        fullName: c.fullName,
        englishName: c.englishName,
        caseForm: c.caseForm,
        numericCode: c.numericCode,
      },
      create: { ...c, isSystem: true, organizationId: null },
    });
  }
  console.log(`✅ Загружено ${CURRENCIES.length} валют`);
}

export async function seedBudgetTypes(prisma: PrismaClient): Promise<void> {
  console.log('Загрузка справочника типов бюджета...');
  for (const bt of BUDGET_TYPES) {
    await prisma.budgetType.upsert({
      where: { code: bt.code },
      update: { name: bt.name, color: bt.color, order: bt.order },
      create: { ...bt, isSystem: true, organizationId: null },
    });
  }
  console.log(`✅ Загружено ${BUDGET_TYPES.length} типов бюджета`);
}

export async function seedMeasurementUnits(prisma: PrismaClient): Promise<void> {
  // @@unique([shortName, organizationId]) не работает для PostgreSQL с NULL-полем
  // (NULL != NULL), поэтому используем findFirst + update/create для идемпотентности
  console.log('Загрузка справочника единиц измерения (ГОСТ 8.417-2002)...');
  for (const u of MEASUREMENT_UNITS) {
    const existing = await prisma.measurementUnitRef.findFirst({
      where: { shortName: u.shortName, organizationId: null },
    });
    if (existing) {
      await prisma.measurementUnitRef.update({
        where: { id: existing.id },
        data: {
          name: u.name,
          ruCode: u.ruCode ?? null,
          intCode: u.intCode ?? null,
          category: u.category,
        },
      });
    } else {
      await prisma.measurementUnitRef.create({
        data: {
          name: u.name,
          shortName: u.shortName,
          ruCode: u.ruCode ?? null,
          intCode: u.intCode ?? null,
          category: u.category,
          isSystem: true,
          organizationId: null,
        },
      });
    }
  }
  console.log(`✅ Загружено ${MEASUREMENT_UNITS.length} единиц измерения`);
}

export async function seedDeclensionCases(prisma: PrismaClient): Promise<void> {
  console.log('Загрузка справочника падежей русского языка...');
  for (const dc of DECLENSION_CASES) {
    await prisma.declensionCase.upsert({
      where: { shortName: dc.shortName },
      update: { name: dc.name, order: dc.order },
      create: { ...dc, isSystem: true },
    });
  }
  console.log(`✅ Загружено ${DECLENSION_CASES.length} падежей`);
}

// ─────────────────────────────────────────────────────────────────
// REF.4 — Виды контрактов (ContractKind)
// ─────────────────────────────────────────────────────────────────

const CONTRACT_KINDS = [
  { code: 'SMR',               name: 'Строительно-монтажные работы',                                                                  shortName: 'СМР', order: 0 },
  { code: 'SURVEY_BUILDING',   name: 'Проведение работ по обследованию здания',                                                        shortName: null,  order: 1 },
  { code: 'TECH_CUSTOMER',     name: 'Осуществление функций технического заказчика и проведение строительного контроля',               shortName: null,  order: 2 },
  { code: 'EXPERTISE',         name: 'Проведение экспертизы',                                                                          shortName: null,  order: 3 },
  { code: 'SMR_TERMINATED',    name: 'Строительно-монтажные работы (расторгнуто)',                                                     shortName: null,  order: 4 },
  { code: 'AUTHOR_SUPERVISION',name: 'Авторский надзор',                                                                               shortName: null,  order: 5 },
  { code: 'SUPPLY',            name: 'Договор поставки',                                                                               shortName: null,  order: 6 },
  { code: 'PIR',               name: 'Договор ПИР',                                                                                    shortName: 'ПИР', order: 7 },
  { code: 'AGENT',             name: 'Агентский договор',                                                                              shortName: null,  order: 8 },
  { code: 'TECH_CONNECTION',   name: 'Технологическое присоединение',                                                                  shortName: null,  order: 9 },
  { code: 'OTHER',             name: 'Прочие',                                                                                         shortName: null,  order: 10 },
];

export async function seedContractKinds(prisma: PrismaClient): Promise<void> {
  console.log('Загрузка справочника видов контрактов...');
  for (const ck of CONTRACT_KINDS) {
    await prisma.contractKind.upsert({
      where: { code: ck.code },
      update: { name: ck.name, shortName: ck.shortName, order: ck.order, isSystem: true },
      create: { ...ck, isSystem: true, isActive: true, organizationId: null },
    });
  }
  console.log(`✅ Загружено ${CONTRACT_KINDS.length} видов контрактов`);
}

// ─────────────────────────────────────────────────────────────────
// REF.4 — Типы документов (DocumentTypeRef)
// ─────────────────────────────────────────────────────────────────

const DOCUMENT_TYPES = [
  // Исполнительная документация
  { code: 'AOSR',                  name: 'Акт освидетельствования скрытых работ',                                     module: 'ID',  order: 0 },
  { code: 'OZR',                   name: 'Общий журнал работ',                                                         module: 'ID',  order: 1 },
  { code: 'KS_2',                  name: 'Акт о приёмке выполненных работ (КС-2)',                                     module: 'ID',  order: 2 },
  { code: 'KS_3',                  name: 'Справка о стоимости выполненных работ (КС-3)',                               module: 'ID',  order: 3 },
  { code: 'AVK',                   name: 'Акт входного контроля',                                                      module: 'ID',  order: 4 },
  { code: 'KS_6A',                 name: 'Журнал учёта выполненных работ (КС-6а)',                                     module: 'ID',  order: 5 },
  { code: 'KS_11',                 name: 'Акт приёмки законченного строительством объекта (КС-11)',                    module: 'ID',  order: 6 },
  { code: 'KS_14',                 name: 'Акт приёмки законченного строительством объекта приёмочной комиссией (КС-14)', module: 'ID', order: 7 },
  { code: 'GENERAL_DOCUMENT',      name: 'Общий документ (свободная форма)',                                           module: 'ID',  order: 8 },
  { code: 'TECHNICAL_READINESS_ACT', name: 'Акт технической готовности',                                              module: 'ID',  order: 9 },
  // Система электронного документооборота
  { code: 'LETTER',                name: 'Письмо',                                                                     module: 'SED', order: 0 },
  { code: 'ORDER',                 name: 'Приказ',                                                                     module: 'SED', order: 1 },
  { code: 'PROTOCOL',              name: 'Протокол',                                                                   module: 'SED', order: 2 },
  { code: 'ACT',                   name: 'Акт',                                                                        module: 'SED', order: 3 },
  { code: 'MEMO',                  name: 'Докладная записка',                                                          module: 'SED', order: 4 },
  { code: 'NOTIFICATION',          name: 'Уведомление',                                                                module: 'SED', order: 5 },
  { code: 'OTHER_SED',             name: 'Иное',                                                                       module: 'SED', order: 6 },
];

export async function seedDocumentTypes(prisma: PrismaClient): Promise<void> {
  console.log('Загрузка справочника типов документов...');
  for (const dt of DOCUMENT_TYPES) {
    await prisma.documentTypeRef.upsert({
      where: { code: dt.code },
      update: { name: dt.name, module: dt.module, order: dt.order, isSystem: true },
      create: { ...dt, isSystem: true, organizationId: null },
    });
  }
  console.log(`✅ Загружено ${DOCUMENT_TYPES.length} типов документов`);
}

// ─────────────────────────────────────────────────────────────────
// REF.4 — Бюджетные статьи расходов (BudgetExpenseItem)
// ─────────────────────────────────────────────────────────────────

async function upsertBudgetItem(
  prisma: PrismaClient,
  data: { code: string; name: string; level: number; order: number; parentId: string | null }
): Promise<string> {
  const existing = await prisma.budgetExpenseItem.findFirst({
    where: { code: data.code, organizationId: null },
  });
  if (existing) {
    await prisma.budgetExpenseItem.update({
      where: { id: existing.id },
      data: { name: data.name, level: data.level, order: data.order, parentId: data.parentId, isSystem: true },
    });
    return existing.id;
  }
  const created = await prisma.budgetExpenseItem.create({
    data: { ...data, isSystem: true, isActive: true, organizationId: null },
  });
  return created.id;
}

export async function seedBudgetExpenseItems(prisma: PrismaClient): Promise<void> {
  console.log('Загрузка справочника статей расходов...');

  // Уровень 0 — корневые статьи
  const smrId  = await upsertBudgetItem(prisma, { code: 'SMR_WORKS',      name: 'Строительно-монтажные работы',      level: 0, order: 0, parentId: null });
  const matId  = await upsertBudgetItem(prisma, { code: 'MATERIALS',      name: 'Материалы',                         level: 0, order: 1, parentId: null });
  await upsertBudgetItem(prisma, { code: 'EQUIPMENT',      name: 'Оборудование',                   level: 0, order: 2, parentId: null });
  await upsertBudgetItem(prisma, { code: 'PIR_COSTS',     name: 'Проектно-изыскательские работы', level: 0, order: 3, parentId: null });
  await upsertBudgetItem(prisma, { code: 'OTHER_EXPENSES',name: 'Прочие расходы',                 level: 0, order: 4, parentId: null });

  // Уровень 1 — статьи СМР
  await upsertBudgetItem(prisma, { code: 'GENERAL_CONSTRUCTION', name: 'Общестроительные', level: 1, order: 0, parentId: smrId });
  await upsertBudgetItem(prisma, { code: 'SPECIAL_WORKS',        name: 'Специальные',      level: 1, order: 1, parentId: smrId });

  // Уровень 1 — статьи Материалы
  await upsertBudgetItem(prisma, { code: 'METAL_STRUCTURES', name: 'Металлоконструкции',    level: 1, order: 0, parentId: matId });
  await upsertBudgetItem(prisma, { code: 'CONCRETE',         name: 'Бетон и железобетон',   level: 1, order: 1, parentId: matId });
  await upsertBudgetItem(prisma, { code: 'BRICK',            name: 'Кирпич',                level: 1, order: 2, parentId: matId });

  console.log('✅ Загружено дерево статей расходов (5 корневых, 5 дочерних)');
}

export async function seedReferenceBooks(prisma: PrismaClient): Promise<void> {
  await seedCurrencies(prisma);
  await seedBudgetTypes(prisma);
  await seedMeasurementUnits(prisma);
  await seedDeclensionCases(prisma);
  console.log('✅ Базовые справочники (REF.3): загружены');
  await seedContractKinds(prisma);
  await seedDocumentTypes(prisma);
  await seedBudgetExpenseItems(prisma);
  console.log('✅ Справочники REF.4: загружены');
}
