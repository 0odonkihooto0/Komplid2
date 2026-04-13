/**
 * Генерация Excel-шаблона для импорта ГПР.
 * Столбцы совпадают с тем что ожидает парсер excel-gpr-parser.ts.
 */
import ExcelJS from 'exceljs';

/** Стиль заголовка (переиспользован из export-gpr.ts) */
const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD9D9D9' },
};
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true };

const TEMPLATE_COLUMNS: Array<{ key: string; header: string; width: number }> = [
  { key: 'num',       header: '№ п/п',                              width: 10 },
  { key: 'name',      header: 'Наименование',                       width: 40 },
  { key: 'unit',      header: 'Ед. изм.',                           width: 12 },
  { key: 'volume',    header: 'Количество',                         width: 14 },
  { key: 'unitCost',  header: 'Стоимость за единицу (включая НДС)', width: 30 },
  { key: 'totalCost', header: 'Общая стоимость',                    width: 20 },
  { key: 'planStart', header: 'План начало',                        width: 16 },
  { key: 'planEnd',   header: 'План окончание',                     width: 16 },
];

/**
 * Генерирует пустой Excel-шаблон с примерами строк.
 */
export async function generateGprExcelTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'StroyDocs';
  workbook.created = new Date();

  // ── Лист 1: Шаблон ГПР ──────────────────────────────────────────
  const sheet = workbook.addWorksheet('Шаблон ГПР', {
    pageSetup: { orientation: 'landscape', fitToPage: true },
  });

  sheet.columns = TEMPLATE_COLUMNS;

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: 'center', wrapText: true };
  });

  // Пример: секция (level 0) — не-числовой «№ п/п»
  sheet.addRow({
    num: 'I',
    name: 'Подготовительные работы',
    unit: '',
    volume: '',
    unitCost: '',
    totalCost: 5000000,
    planStart: '01.06.2025',
    planEnd: '30.06.2025',
  });

  // Пример: работа (level 1) — числовой «№ п/п»
  sheet.addRow({
    num: '1',
    name: 'Устройство временного ограждения',
    unit: 'м.п.',
    volume: 250,
    unitCost: 1200,
    totalCost: 300000,
    planStart: '01.06.2025',
    planEnd: '15.06.2025',
  });

  // ── Лист 2: Инструкция ───────────────────────────────────────────
  const infoSheet = workbook.addWorksheet('Инструкция');
  infoSheet.getColumn(1).width = 80;

  const instructions = [
    'Инструкция по заполнению шаблона ГПР',
    '',
    '1. Заполняйте данные на листе «Шаблон ГПР», начиная со строки 2 (строка 1 — заголовок).',
    '2. Формат дат: дд.мм.гггг (например, 01.06.2025).',
    '3. Секции/разделы: в колонке «№ п/п» укажите нечисловое значение (I, II, «А» и т.д.).',
    '4. Работы: в колонке «№ п/п» укажите числовое значение (1, 2, 3...).',
    '   Работы автоматически привязываются к ближайшей секции выше.',
    '5. Строки «Итого» / «Всего» будут пропущены при импорте.',
    '6. Колонки «Стоимость за единицу» и «Общая стоимость» — необязательны.',
    '7. Не меняйте порядок и названия колонок в заголовке.',
  ];

  for (const line of instructions) {
    const row = infoSheet.addRow([line]);
    if (line === instructions[0]) {
      row.font = { bold: true, size: 14 };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
