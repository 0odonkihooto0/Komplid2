import ExcelJS from 'exceljs';
import type { EstimateChangePreviewItem } from './estimate-changes-preview';

const STATUS_LABEL: Record<string, string> = {
  WILL_DELETE: 'Будет удалена',
  WILL_CHANGE: 'Будет изменена',
  WILL_ADD: 'Будет добавлена',
};

const TYPE_LABEL: Record<string, string> = {
  ESTIMATE: 'Смета',
  SECTION: 'Раздел',
  ITEM: 'Позиция',
};

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' },
};

const ROW_FILLS: Record<string, ExcelJS.Fill> = {
  WILL_DELETE: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } },
  WILL_ADD: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } },
  WILL_CHANGE: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } },
};

/**
 * Экспорт предпросмотра изменений сметы в Excel (клиентский).
 * Возвращает Blob для скачивания.
 */
export async function exportEstimateChangesToExcel(
  items: EstimateChangePreviewItem[],
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'StroyDocs';
  wb.created = new Date();

  const ws = wb.addWorksheet('Изменения сметы');

  // Колонки
  ws.columns = [
    { header: 'Тип', key: 'type', width: 12 },
    { header: 'Наименование', key: 'name', width: 40 },
    { header: 'Единицы', key: 'unit', width: 10 },
    { header: 'Объём (тек)', key: 'volCur', width: 14 },
    { header: 'Объём (нов)', key: 'volNew', width: 14 },
    { header: 'Стоимость (тек)', key: 'amtCur', width: 16 },
    { header: 'Стоимость (нов)', key: 'amtNew', width: 16 },
    { header: 'Статус', key: 'status', width: 18 },
  ];

  // Стилизация заголовка
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => { cell.fill = HEADER_FILL; });

  // Данные
  for (const item of items) {
    const cur = item.currentData;
    const nxt = item.newData;
    const row = ws.addRow({
      type: TYPE_LABEL[item.type] ?? item.type,
      name: item.name,
      unit: (item.status === 'WILL_DELETE' ? cur?.unit : nxt?.unit) ?? '',
      volCur: cur?.volume ?? '',
      volNew: nxt?.volume ?? '',
      amtCur: cur?.amount ?? '',
      amtNew: nxt?.amount ?? '',
      status: STATUS_LABEL[item.status] ?? item.status,
    });

    // Цвет строки
    const fill = ROW_FILLS[item.status];
    if (fill) {
      row.eachCell((cell) => { cell.fill = fill; });
    }

    // Жирный шрифт для ESTIMATE и SECTION
    if (item.type === 'ESTIMATE' || item.type === 'SECTION') {
      row.font = { bold: true };
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
