import { PrismaClient } from '@prisma/client';

// Системные шаблоны отчётов StroyDocs
// Каждый шаблон содержит набор блоков (blockDefinitions) для формирования PDF-отчётов

const REPORT_TEMPLATES = [
  {
    name: 'Еженедельный отчёт о ходе работ',
    description: 'Стандартный шаблон для еженедельного отчёта по объёму работ, ГПР и недостаткам',
    blockDefinitions: [
      { order: 0, type: 'TITLE_PAGE', title: 'Титульный лист' },
      { order: 1, type: 'WORK_VOLUMES', title: 'Объём выполненных работ' },
      { order: 2, type: 'GPR_PROGRESS', title: 'Ход выполнения ГПР' },
      { order: 3, type: 'DEFECTS_SUMMARY', title: 'Сводка недостатков' },
      { order: 4, type: 'FREE_TEXT', title: 'Заключение' },
    ],
  },
  {
    name: 'Ежемесячный отчёт',
    description: 'Полный ежемесячный отчёт с финансовым блоком, КС-2 и исполнительной документацией',
    blockDefinitions: [
      { order: 0, type: 'TITLE_PAGE', title: 'Титульный лист' },
      { order: 1, type: 'WORK_VOLUMES', title: 'Объём выполненных работ' },
      { order: 2, type: 'KS2_ACTS', title: 'Акты КС-2' },
      { order: 3, type: 'ID_STATUS', title: 'Исполнительная документация' },
      { order: 4, type: 'FUNDING_STATUS', title: 'Финансирование' },
      { order: 5, type: 'DEFECTS_SUMMARY', title: 'Недостатки' },
    ],
  },
  {
    name: 'Отчёт по итогам проверки',
    description: 'Шаблон для отчёта по итогам инспекционной проверки с фото-материалами',
    blockDefinitions: [
      { order: 0, type: 'TITLE_PAGE', title: 'Титульный лист' },
      { order: 1, type: 'DEFECTS_SUMMARY', title: 'Выявленные недостатки' },
      { order: 2, type: 'PHOTO_REPORT', title: 'Фото-материалы' },
      { order: 3, type: 'FREE_TEXT', title: 'Выводы и рекомендации' },
    ],
  },
  {
    name: 'Финансовый отчёт',
    description: 'Отчёт по финансированию и актам КС-2 за период',
    blockDefinitions: [
      { order: 0, type: 'TITLE_PAGE', title: 'Титульный лист' },
      { order: 1, type: 'KS2_ACTS', title: 'Акты КС-2 за период' },
      { order: 2, type: 'FUNDING_STATUS', title: 'Исполнение финансирования' },
      { order: 3, type: 'FREE_TEXT', title: 'Примечания' },
    ],
  },
  {
    name: 'Фото-отчёт',
    description: 'Шаблон для фотографического отчёта о ходе строительства',
    blockDefinitions: [
      { order: 0, type: 'TITLE_PAGE', title: 'Титульный лист' },
      { order: 1, type: 'PHOTO_REPORT', title: 'Фотоматериалы' },
      { order: 2, type: 'FREE_TEXT', title: 'Описание' },
    ],
  },
];

/**
 * Засеивает системные шаблоны отчётов.
 * Использует findFirst + условный create (без upsert — нет уникального ограничения на name).
 * Безопасно запускать повторно — дубликаты не создаются.
 */
export async function seedReportTemplates(prisma: PrismaClient): Promise<void> {
  for (const template of REPORT_TEMPLATES) {
    const existing = await prisma.reportTemplate.findFirst({
      where: { name: template.name, isSystem: true },
    });
    if (!existing) {
      await prisma.reportTemplate.create({
        data: {
          ...template,
          isSystem: true,
        },
      });
    }
  }
}
