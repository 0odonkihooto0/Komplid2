/**
 * Утилита конвертации .docx → .pdf через LibreOffice headless.
 * LibreOffice должен быть установлен в окружении (Dockerfile: apk add libreoffice).
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

/**
 * Конвертирует Buffer с содержимым .docx файла в Buffer с содержимым .pdf.
 * Использует LibreOffice headless (`libreoffice --headless --convert-to pdf`).
 *
 * @param docxBuffer - содержимое .docx файла
 * @returns Buffer с содержимым .pdf
 */
export async function convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tmpDir = os.tmpdir();
  const tmpDocx = path.join(tmpDir, `aosr_${id}.docx`);
  const pdfPath = tmpDocx.replace('.docx', '.pdf');

  try {
    fs.writeFileSync(tmpDocx, docxBuffer);

    await execFileAsync('libreoffice', [
      '--headless',
      '--convert-to', 'pdf',
      '--outdir', tmpDir,
      tmpDocx,
    ]);

    // LibreOffice называет выходной файл как входной, но с расширением .pdf
    return fs.readFileSync(pdfPath);
  } finally {
    if (fs.existsSync(tmpDocx)) fs.unlinkSync(tmpDocx);
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
  }
}
