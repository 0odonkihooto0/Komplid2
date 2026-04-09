import { PDFDocument } from 'pdf-lib';

/**
 * Наложение QR-кода (PNG) на существующий PDF.
 * Используется для штампов верификации на исполнительной документации.
 *
 * @param pdfBuffer - буфер исходного PDF-файла
 * @param qrPngBuffer - буфер PNG-изображения QR-кода
 * @param pageIndex - индекс страницы (0-based), default 0
 * @param x - X-координата в пунктах от левого края, default: правый нижний угол
 * @param y - Y-координата в пунктах от нижнего края, default: нижний край
 * @param size - размер QR-кода в пунктах, default 80
 * @returns буфер PDF с наложенным QR-кодом
 */
export async function overlayQrOnPdf(
  pdfBuffer: Buffer,
  qrPngBuffer: Buffer,
  pageIndex = 0,
  x?: number,
  y?: number,
  size = 80,
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();

  // Проверка индекса страницы
  if (pageIndex < 0 || pageIndex >= pages.length) {
    throw new Error(
      `Страница ${pageIndex} не найдена. Всего страниц: ${pages.length}`,
    );
  }

  const page = pages[pageIndex];
  const { width } = page.getSize();

  // Позиция по умолчанию — правый нижний угол с отступом 20pt
  const stampX = x ?? width - size - 20;
  const stampY = y ?? 20;

  // Встраиваем PNG-изображение QR-кода в документ
  const qrImage = await pdfDoc.embedPng(qrPngBuffer);

  page.drawImage(qrImage, {
    x: stampX,
    y: stampY,
    width: size,
    height: size,
  });

  const resultBytes = await pdfDoc.save();
  return Buffer.from(resultBytes);
}
