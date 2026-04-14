import ExcelJS from 'exceljs';
import type { SpecialJournalType } from '@prisma/client';

/** Минимальный тип записи для экспорта */
export interface ExportJournalEntry {
  entryNumber: number;
  date: Date;
  status: string;
  description: string;
  location: string | null;
  normativeRef: string | null;
  weather: string | null;
  temperature: number | null;
  data: Record<string, unknown> | null;
}

/** Минимальный тип журнала для экспорта */
export interface ExportJournal {
  number: string;
  title: string | null;
  type: SpecialJournalType;
}

/** Определение колонки журнала */
interface JournalColumn {
  header: string;
  key: string;
  width: number;
  /** Извлечение значения для экспорта */
  extract: (entry: ExportJournalEntry) => string | number | null;
}

/** Лейблы статусов записей для XLS */
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  SUBMITTED: 'На проверке',
  APPROVED: 'Утверждена',
  REJECTED: 'Отклонена',
};

/** Форматирование даты в DD.MM.YYYY */
function fmtDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

/** Общие 8 колонок для всех типов журналов */
const BASE_COLUMNS: JournalColumn[] = [
  {
    header: '№ записи',
    key: 'entryNumber',
    width: 10,
    extract: (e) => e.entryNumber,
  },
  {
    header: 'Дата (ДД.ММ.ГГГГ) *',
    key: 'date',
    width: 18,
    extract: (e) => fmtDate(new Date(e.date)),
  },
  {
    header: 'Статус',
    key: 'status',
    width: 14,
    extract: (e) => STATUS_LABELS[e.status] ?? e.status,
  },
  {
    header: 'Описание *',
    key: 'description',
    width: 40,
    extract: (e) => e.description,
  },
  {
    header: 'Местоположение',
    key: 'location',
    width: 25,
    extract: (e) => e.location,
  },
  {
    header: 'Нормативная ссылка',
    key: 'normativeRef',
    width: 22,
    extract: (e) => e.normativeRef,
  },
  {
    header: 'Погода',
    key: 'weather',
    width: 14,
    extract: (e) => e.weather,
  },
  {
    header: 'Температура (°C)',
    key: 'temperature',
    width: 16,
    extract: (e) => e.temperature,
  },
];

/** Дополнительные колонки для бетонных работ */
const CONCRETE_COLUMNS: JournalColumn[] = [
  {
    header: 'Конструкция',
    key: 'structureName',
    width: 25,
    extract: (e) => (e.data?.structureName as string) ?? null,
  },
  {
    header: 'Класс бетона',
    key: 'concreteClass',
    width: 14,
    extract: (e) => (e.data?.concreteClass as string) ?? null,
  },
  {
    header: 'Объём (м³)',
    key: 'volume',
    width: 12,
    extract: (e) => (e.data?.volume as number) ?? null,
  },
  {
    header: 'Способ укладки',
    key: 'placementMethod',
    width: 20,
    extract: (e) => (e.data?.placementMethod as string) ?? null,
  },
  {
    header: 'Температура смеси (°C)',
    key: 'mixTemperature',
    width: 20,
    extract: (e) => (e.data?.mixTemperature as number) ?? null,
  },
  {
    header: 'Способ ухода',
    key: 'curingMethod',
    width: 20,
    extract: (e) => (e.data?.curingMethod as string) ?? null,
  },
];

/** Дополнительные колонки для сварочных работ */
const WELDING_COLUMNS: JournalColumn[] = [
  {
    header: 'Тип соединения',
    key: 'jointType',
    width: 18,
    extract: (e) => (e.data?.jointType as string) ?? null,
  },
  {
    header: 'Основной металл',
    key: 'baseMetal',
    width: 18,
    extract: (e) => (e.data?.baseMetal as string) ?? null,
  },
  {
    header: 'Толщина (мм)',
    key: 'thickness',
    width: 14,
    extract: (e) => (e.data?.thickness as number) ?? null,
  },
  {
    header: 'Марка электрода',
    key: 'electrodeMark',
    width: 18,
    extract: (e) => (e.data?.electrodeMark as string) ?? null,
  },
  {
    header: 'Метод сварки',
    key: 'weldingMethod',
    width: 16,
    extract: (e) => (e.data?.weldingMethod as string) ?? null,
  },
  {
    header: 'Клеймо сварщика',
    key: 'welderStampNumber',
    width: 16,
    extract: (e) => (e.data?.welderStampNumber as string) ?? null,
  },
  {
    header: 'ФИО сварщика',
    key: 'welderFullName',
    width: 22,
    extract: (e) => (e.data?.welderFullName as string) ?? null,
  },
  {
    header: 'Вид контроля',
    key: 'controlType',
    width: 16,
    extract: (e) => (e.data?.controlType as string) ?? null,
  },
  {
    header: 'Результат контроля',
    key: 'controlResult',
    width: 20,
    extract: (e) => (e.data?.controlResult as string) ?? null,
  },
];

/** Дополнительные колонки для авторского надзора */
const SUPERVISION_COLUMNS: JournalColumn[] = [
  {
    header: 'Представитель проектной организации',
    key: 'designOrgRepresentative',
    width: 32,
    extract: (e) => (e.data?.designOrgRepresentative as string) ?? null,
  },
  {
    header: 'Выявленные отклонения',
    key: 'deviationsFound',
    width: 30,
    extract: (e) => (e.data?.deviationsFound as string) ?? null,
  },
  {
    header: 'Указания',
    key: 'instructions',
    width: 30,
    extract: (e) => (e.data?.instructions as string) ?? null,
  },
  {
    header: 'Срок исполнения указаний',
    key: 'instructionDeadline',
    width: 22,
    extract: (e) => (e.data?.instructionDeadline as string) ?? null,
  },
  {
    header: 'Примечание об исполнении',
    key: 'implementationNote',
    width: 28,
    extract: (e) => (e.data?.implementationNote as string) ?? null,
  },
];

/**
 * Возвращает список колонок для данного типа журнала.
 * Общие 8 + type-specific.
 */
export function buildJournalColumns(type: SpecialJournalType): JournalColumn[] {
  if (type === 'CONCRETE_WORKS') return [...BASE_COLUMNS, ...CONCRETE_COLUMNS];
  if (type === 'WELDING_WORKS') return [...BASE_COLUMNS, ...WELDING_COLUMNS];
  if (type === 'AUTHOR_SUPERVISION') return [...BASE_COLUMNS, ...SUPERVISION_COLUMNS];
  return BASE_COLUMNS;
}

/**
 * Генерирует пустой xlsx-шаблон для импорта записей журнала.
 * Лист 1 — шаблон с заголовками (bold + фон), лист 2 — инструкция.
 */
export async function generateJournalTemplate(
  type: SpecialJournalType,
  journalNumber: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'StroyDocs';

  const columns = buildJournalColumns(type);

  // === Лист 1: Шаблон ===
  const sheet = workbook.addWorksheet('Записи');
  sheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  // Стиль заголовочной строки
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' },
  };
  headerRow.alignment = { wrapText: true, vertical: 'middle' };
  headerRow.height = 30;
  headerRow.commit();

  // Примечание в шапке
  sheet.getCell('A2').value = `Шаблон журнала: ${journalNumber}`;
  sheet.getCell('A2').font = { italic: true, color: { argb: 'FF888888' } };

  // === Лист 2: Инструкция ===
  const instr = workbook.addWorksheet('Инструкция');
  instr.getColumn(1).width = 80;
  const lines = [
    'ИНСТРУКЦИЯ ПО ЗАПОЛНЕНИЮ ШАБЛОНА ИМПОРТА ЗАПИСЕЙ ЖУРНАЛА',
    '',
    '1. Вернитесь на лист "Записи" и заполняйте данные начиная с 3-й строки.',
    '   (Строка 1 — заголовки, строка 2 — примечание, строки 3+ — данные)',
    '',
    '2. Поля, отмеченные * в заголовке, являются обязательными:',
    '   - Дата: формат ДД.ММ.ГГГГ (например, 14.04.2026)',
    '   - Описание: текстовое описание выполненных работ',
    '',
    '3. Столбец "№ записи" игнорируется при импорте — нумерация присваивается автоматически.',
    '4. Столбец "Статус" игнорируется при импорте — все записи создаются со статусом «Черновик».',
    '5. Пустые строки (без даты или описания) пропускаются.',
    '',
    '6. После заполнения сохраните файл в формате .xlsx и загрузите через кнопку «Импорт Excel».',
  ];
  lines.forEach((line, i) => {
    const cell = instr.getCell(`A${i + 1}`);
    cell.value = line;
    if (i === 0) cell.font = { bold: true, size: 12 };
    else cell.font = { size: 11 };
    cell.alignment = { wrapText: true };
  });

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}

/**
 * Генерирует xlsx-файл со всеми записями журнала (экспорт).
 * Лист 1 — реквизиты журнала + таблица записей.
 */
export async function generateJournalXls(
  journal: ExportJournal,
  entries: ExportJournalEntry[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'StroyDocs';

  const columns = buildJournalColumns(journal.type);
  const sheet = workbook.addWorksheet('Записи');

  // Шапка: 3 строки с реквизитами журнала
  sheet.mergeCells('A1:D1');
  sheet.getCell('A1').value = journal.title ?? journal.number;
  sheet.getCell('A1').font = { bold: true, size: 13 };

  sheet.mergeCells('A2:D2');
  sheet.getCell('A2').value = `Журнал № ${journal.number}`;
  sheet.getCell('A2').font = { size: 11 };

  sheet.mergeCells('A3:D3');
  sheet.getCell('A3').value = `Сформировано: ${fmtDate(new Date())}`;
  sheet.getCell('A3').font = { italic: true, color: { argb: 'FF888888' }, size: 10 };

  // Пустая строка-разделитель
  sheet.addRow([]);

  // Строка заголовков таблицы (строка 5)
  const headerRow = sheet.addRow(columns.map((c) => c.header));
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' },
  };
  headerRow.alignment = { wrapText: true, vertical: 'middle' };
  headerRow.height = 28;

  // Устанавливаем ширину колонок
  columns.forEach((col, idx) => {
    sheet.getColumn(idx + 1).width = col.width;
  });

  // Строки данных
  for (const entry of entries) {
    const values = columns.map((col) => col.extract(entry) ?? '');
    sheet.addRow(values);
  }

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}
