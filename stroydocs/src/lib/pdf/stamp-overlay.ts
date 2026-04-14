import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { promises as fs } from 'fs';
import path from 'path';

/** Данные для штампа */
export interface StampData {
  /** Номер документа (для work_permit) */
  docNumber?: string;
  /** Дата в формате DD.MM.YYYY */
  date?: string;
  /** ФИО ответственного (для work_permit) */
  responsibleName?: string;
  /** ФИО заверяющего (для certified_copy) */
  certifiedByName?: string;
  /** Должность заверяющего (для certified_copy) */
  certifiedByPos?: string;
}

export type StampType = 'work_permit' | 'certified_copy';

// Кэш шрифтов на уровне модуля (Promise-паттерн, не readFileSync)
let regularFontPromise: Promise<Buffer> | null = null;
let boldFontPromise: Promise<Buffer> | null = null;

function loadFont(filename: string): Promise<Buffer> {
  const fontPath = path.join(process.cwd(), 'src', 'lib', 'pdf', 'fonts', filename);
  return fs.readFile(fontPath);
}

function getRegularFont(): Promise<Buffer> {
  if (!regularFontPromise) {
    regularFontPromise = loadFont('LiberationSans-Regular.ttf');
  }
  return regularFontPromise;
}

function getBoldFont(): Promise<Buffer> {
  if (!boldFontPromise) {
    boldFontPromise = loadFont('LiberationSans-Bold.ttf');
  }
  return boldFontPromise;
}

// Константы оформления штампа
const STAMP_PADDING = 8;
const FONT_SIZE_TITLE = 9;
const FONT_SIZE_TEXT = 8;
const LINE_HEIGHT = 13;
const BORDER_COLOR = rgb(0, 0, 0);
const BG_COLOR = rgb(1, 1, 1);
const TEXT_COLOR = rgb(0, 0, 0);

/**
 * Наложение текстового штампа на PDF.
 *
 * @param pdfBuffer - буфер исходного PDF-файла
 * @param stampType - тип штампа: "work_permit" | "certified_copy"
 * @param pageIndex - индекс страницы (0-based)
 * @param x - X-координата в пунктах PDF (от левого края)
 * @param y - Y-координата в пунктах PDF (от нижнего края)
 * @param stampData - данные для подстановки в штамп
 * @returns буфер PDF с наложенным штампом
 */
export async function overlayStamp(
  pdfBuffer: Buffer,
  stampType: StampType,
  pageIndex: number,
  x: number,
  y: number,
  stampData: StampData,
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  pdfDoc.registerFontkit(fontkit);

  const pages = pdfDoc.getPages();
  if (pageIndex < 0 || pageIndex >= pages.length) {
    throw new Error(
      `Страница ${pageIndex} не найдена. Всего страниц: ${pages.length}`,
    );
  }

  // Загрузка шрифтов Liberation Sans (кириллица, свободная лицензия)
  const [regularFontBytes, boldFontBytes] = await Promise.all([
    getRegularFont(),
    getBoldFont(),
  ]);
  const regularFont = await pdfDoc.embedFont(regularFontBytes);
  const boldFont = await pdfDoc.embedFont(boldFontBytes);

  const page = pages[pageIndex];

  if (stampType === 'work_permit') {
    drawWorkPermitStamp(page, x, y, stampData, regularFont, boldFont);
  } else {
    drawCertifiedCopyStamp(page, x, y, stampData, regularFont, boldFont);
  }

  const resultBytes = await pdfDoc.save();
  return Buffer.from(resultBytes);
}

/** Штамп «Разрешение на производство работ» */
function drawWorkPermitStamp(
  page: PDFPage,
  x: number,
  y: number,
  data: StampData,
  regularFont: PDFFont,
  boldFont: PDFFont,
) {
  const title = 'РАЗРЕШЕНИЕ НА ПРОИЗВОДСТВО РАБОТ';
  const lines = [
    title,
    data.docNumber ? `Документ: ${data.docNumber}` : '',
    `Дата: ${data.date || new Date().toLocaleDateString('ru-RU')}`,
    data.responsibleName ? `Ответственный: ${data.responsibleName}` : '',
  ].filter(Boolean);

  drawStampBox(page, x, y, lines, regularFont, boldFont);
}

/** Штамп «Копия верна» */
function drawCertifiedCopyStamp(
  page: PDFPage,
  x: number,
  y: number,
  data: StampData,
  regularFont: PDFFont,
  boldFont: PDFFont,
) {
  const title = 'КОПИЯ ВЕРНА';
  const infoLine = [data.certifiedByPos, data.certifiedByName]
    .filter(Boolean)
    .join(' ');
  const dateLine = `Дата: ${data.date || new Date().toLocaleDateString('ru-RU')}`;

  const lines = [title, infoLine, dateLine].filter(Boolean);

  drawStampBox(page, x, y, lines, regularFont, boldFont);
}

/** Рисует рамку и текст штампа (общая логика для обоих типов) */
function drawStampBox(
  page: PDFPage,
  x: number,
  y: number,
  lines: string[],
  regularFont: PDFFont,
  boldFont: PDFFont,
) {
  // Расчёт ширины штампа по самой длинной строке
  const maxWidth = Math.max(
    ...lines.map((line, i) => {
      const font = i === 0 ? boldFont : regularFont;
      const size = i === 0 ? FONT_SIZE_TITLE : FONT_SIZE_TEXT;
      return font.widthOfTextAtSize(line, size);
    }),
  );
  const boxWidth = maxWidth + STAMP_PADDING * 2;
  const boxHeight = lines.length * LINE_HEIGHT + STAMP_PADDING * 2;

  // Рамка с белым фоном
  page.drawRectangle({
    x: x - STAMP_PADDING,
    y: y - STAMP_PADDING,
    width: boxWidth,
    height: boxHeight,
    borderColor: BORDER_COLOR,
    borderWidth: 1,
    color: BG_COLOR,
    opacity: 0.95,
  });

  // Текст штампа (сверху вниз; PDF Y растёт снизу вверх)
  lines.forEach((line, i) => {
    const isTitle = i === 0;
    const font = isTitle ? boldFont : regularFont;
    const size = isTitle ? FONT_SIZE_TITLE : FONT_SIZE_TEXT;
    const lineY = y + boxHeight - STAMP_PADDING * 2 - i * LINE_HEIGHT;

    page.drawText(line, { x, y: lineY, size, font, color: TEXT_COLOR });
  });
}

/**
 * Наложение произвольного текстового штампа на PDF (для ПИР-штампов).
 *
 * @param pdfBuffer - буфер исходного PDF-файла
 * @param pageIndex - индекс страницы (0-based)
 * @param xNorm - нормализованная X-координата (0–1, от левого края)
 * @param yNorm - нормализованная Y-координата (0–1, от верхнего края)
 * @param text - текст штампа
 * @param widthPx - ширина штампа в пикселях
 * @param heightPx - высота штампа в пикселях
 * @returns буфер PDF с наложенным штампом
 */
export async function overlayTextStamp(
  pdfBuffer: Buffer,
  pageIndex: number,
  xNorm: number,
  yNorm: number,
  text: string,
  widthPx: number,
  heightPx: number,
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  pdfDoc.registerFontkit(fontkit);

  const pages = pdfDoc.getPages();
  if (pageIndex < 0 || pageIndex >= pages.length) {
    throw new Error(
      `Страница ${pageIndex} не найдена. Всего страниц: ${pages.length}`,
    );
  }

  // Загрузка шрифтов Liberation Sans (кириллица, свободная лицензия)
  const [regularFontBytes, boldFontBytes] = await Promise.all([
    getRegularFont(),
    getBoldFont(),
  ]);
  const regularFont = await pdfDoc.embedFont(regularFontBytes);
  const boldFont = await pdfDoc.embedFont(boldFontBytes);

  const page = pages[pageIndex];
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();

  // Перевод нормализованных координат в PDF-пункты (Y инвертирован в PDF)
  // 1px ≈ 0.75pt (96dpi → 72dpi)
  const PX_TO_PT = 0.75;
  const heightPt = heightPx * PX_TO_PT;
  const xPt = xNorm * pageWidth;
  // PDF считает Y от нижнего края; yNorm от верхнего → инвертируем
  const yPt = (1 - yNorm) * pageHeight - heightPt;

  // Разбиваем текст на строки по переносам
  const lines = text.split('\n').filter(Boolean);
  if (lines.length === 0) {
    const resultBytes = await pdfDoc.save();
    return Buffer.from(resultBytes);
  }

  drawStampBox(page, xPt, yPt, lines, regularFont, boldFont);

  const resultBytes = await pdfDoc.save();
  return Buffer.from(resultBytes);
}
