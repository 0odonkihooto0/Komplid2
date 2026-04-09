import { PrismaClient } from '@prisma/client';

// Предустановленные конфигурации тематических отчётов StroyDocs
// Каждый slug соответствует конкретному типу данных и набору доступных колонок

const THEMATIC_REPORTS = [
  {
    slug: 'defects-report',
    name: 'Отчёт по недостаткам',
    category: 'СК',
    dataSource: 'defects',
    availableColumns: [
      { key: 'objectName', label: 'Наименование объекта' },
      { key: 'number', label: 'Номер недостатка' },
      { key: 'category', label: 'Категория' },
      { key: 'description', label: 'Описание' },
      { key: 'standard', label: 'Нарушен стандарт' },
      { key: 'deadline', label: 'Срок устранения' },
      { key: 'status', label: 'Статус' },
      { key: 'responsible', label: 'Исполнитель' },
      { key: 'author', label: 'Автор' },
      { key: 'createdAt', label: 'Дата выявления' },
    ],
    defaultColumns: ['objectName', 'number', 'description', 'standard', 'deadline', 'status'],
  },
  {
    slug: 'prescriptions-report',
    name: 'Оперативный отчёт по предписаниям',
    category: 'СК',
    dataSource: 'prescriptions',
    availableColumns: [
      { key: 'objectName', label: 'Наименование объекта' },
      { key: 'number', label: 'Номер предписания' },
      { key: 'type', label: 'Тип' },
      { key: 'description', label: 'Описание' },
      { key: 'deadline', label: 'Срок устранения' },
      { key: 'closedAt', label: 'Дата закрытия' },
      { key: 'status', label: 'Статус' },
      { key: 'responsible', label: 'Исполнитель' },
      { key: 'author', label: 'Автор' },
      { key: 'createdAt', label: 'Дата выдачи' },
    ],
    defaultColumns: ['objectName', 'number', 'description', 'deadline', 'status'],
  },
  {
    slug: 'defects-by-object',
    name: 'Пообъектный отчёт по недостаткам',
    category: 'СК',
    dataSource: 'defects',
    availableColumns: [
      { key: 'objectName', label: 'Наименование объекта' },
      { key: 'totalDefects', label: 'Всего недостатков' },
      { key: 'openDefects', label: 'Открытых' },
      { key: 'closedDefects', label: 'Устранённых' },
      { key: 'overdueDefects', label: 'Просроченных' },
    ],
    defaultColumns: ['objectName', 'totalDefects', 'openDefects', 'closedDefects', 'overdueDefects'],
  },
  {
    slug: 'sk-engineers-report',
    name: 'Отчёт о работе инженеров СК',
    category: 'СК',
    dataSource: 'inspections',
    availableColumns: [
      { key: 'engineerName', label: 'ФИО инженера' },
      { key: 'objectName', label: 'Объект' },
      { key: 'date', label: 'Дата проверки' },
      { key: 'type', label: 'Тип проверки' },
      { key: 'result', label: 'Результат' },
      { key: 'defectsFound', label: 'Выявлено недостатков' },
      { key: 'prescriptionsIssued', label: 'Выдано предписаний' },
    ],
    defaultColumns: ['engineerName', 'objectName', 'date', 'type', 'result', 'defectsFound'],
  },
  {
    slug: 'sk-signatures-report',
    name: 'Отчёт по подписаниям документов СК',
    category: 'СК',
    dataSource: 'inspectionActs',
    availableColumns: [
      { key: 'objectName', label: 'Объект' },
      { key: 'actType', label: 'Тип акта' },
      { key: 'actNumber', label: 'Номер документа' },
      { key: 'status', label: 'Статус' },
      { key: 'signatories', label: 'Подписанты' },
      { key: 'createdAt', label: 'Дата создания' },
      { key: 'signedAt', label: 'Дата подписания' },
    ],
    defaultColumns: ['objectName', 'actType', 'actNumber', 'status', 'createdAt'],
  },
  {
    slug: 'work-volumes',
    name: 'Объёмы выполненных работ',
    category: 'СМР',
    dataSource: 'workRecords',
    availableColumns: [
      { key: 'objectName', label: 'Объект' },
      { key: 'date', label: 'Дата' },
      { key: 'workName', label: 'Наименование работы' },
      { key: 'unit', label: 'Ед. изм.' },
      { key: 'quantity', label: 'Объём' },
      { key: 'location', label: 'Место производства' },
      { key: 'contractorName', label: 'Подрядчик' },
    ],
    defaultColumns: ['objectName', 'date', 'workName', 'unit', 'quantity'],
  },
  {
    slug: 'ks2-summary',
    name: 'Сводка КС-2 за период',
    category: 'СМР',
    dataSource: 'ks2acts',
    availableColumns: [
      { key: 'objectName', label: 'Объект' },
      { key: 'actNumber', label: 'Номер акта' },
      { key: 'contractName', label: 'Договор' },
      { key: 'periodStart', label: 'Начало периода' },
      { key: 'periodEnd', label: 'Конец периода' },
      { key: 'amount', label: 'Сумма, ₽' },
      { key: 'status', label: 'Статус' },
    ],
    defaultColumns: ['objectName', 'actNumber', 'contractName', 'periodStart', 'periodEnd', 'amount', 'status'],
  },
  {
    slug: 'gpr-deviation',
    name: 'Отклонения от ГПР',
    category: 'ГПР',
    dataSource: 'ganttTasks',
    availableColumns: [
      { key: 'objectName', label: 'Объект' },
      { key: 'taskName', label: 'Наименование работы' },
      { key: 'planStart', label: 'План начало' },
      { key: 'planEnd', label: 'План конец' },
      { key: 'factStart', label: 'Факт начало' },
      { key: 'factEnd', label: 'Факт конец' },
      { key: 'progress', label: 'Готовность, %' },
      { key: 'deviationDays', label: 'Отклонение, дней' },
      { key: 'isCritical', label: 'Критический путь' },
    ],
    defaultColumns: ['objectName', 'taskName', 'planStart', 'planEnd', 'deviationDays', 'isCritical'],
  },
  {
    slug: 'payments-report',
    name: 'Отчёт по оплатам',
    category: 'Финансовые',
    dataSource: 'contractPayments',
    availableColumns: [
      { key: 'objectName', label: 'Объект' },
      { key: 'date', label: 'Дата оплаты' },
      { key: 'paymentType', label: 'Тип' },
      { key: 'amount', label: 'Сумма, ₽' },
      { key: 'contractName', label: 'Договор' },
      { key: 'contractorName', label: 'Подрядчик' },
      { key: 'description', label: 'Описание' },
    ],
    defaultColumns: ['objectName', 'date', 'paymentType', 'amount', 'contractName'],
  },
  {
    slug: 'funding-report',
    name: 'Исполнение финансирования',
    category: 'Финансовые',
    dataSource: 'fundingSources',
    availableColumns: [
      { key: 'objectName', label: 'Объект' },
      { key: 'sourceName', label: 'Источник финансирования' },
      { key: 'planned', label: 'Плановый объём, ₽' },
      { key: 'actual', label: 'Фактическое освоение, ₽' },
      { key: 'utilization', label: 'Освоение, %' },
      { key: 'year', label: 'Год' },
      { key: 'quarter', label: 'Квартал' },
    ],
    defaultColumns: ['objectName', 'sourceName', 'planned', 'actual', 'utilization'],
  },
] as const;

/**
 * Засеивает предустановленные конфигурации тематических отчётов.
 * Используется при первоначальном развёртывании и при обновлениях.
 * Upsert по slug — безопасно запускать повторно.
 */
export async function seedThematicReports(prisma: PrismaClient): Promise<void> {
  for (const report of THEMATIC_REPORTS) {
    await prisma.thematicReportConfig.upsert({
      where: { slug: report.slug },
      update: {
        name: report.name,
        category: report.category,
        dataSource: report.dataSource,
        availableColumns: report.availableColumns,
        defaultColumns: report.defaultColumns,
        isActive: true,
      },
      create: {
        slug: report.slug,
        name: report.name,
        category: report.category,
        dataSource: report.dataSource,
        availableColumns: report.availableColumns,
        defaultColumns: report.defaultColumns,
        isActive: true,
      },
    });
  }
}
