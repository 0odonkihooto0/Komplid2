import Handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';

try {
  Handlebars.registerHelper('addOne', (index: number) => index + 1);
} catch {
  // already registered
}

async function htmlToPdf(html: string): Promise<Buffer> {
  const puppeteer = await import('puppeteer-core');
  let executablePath = process.env.CHROMIUM_PATH;
  if (!executablePath) {
    const commonPaths = [
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
    ];
    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        executablePath = p;
        break;
      }
    }
  }
  if (!executablePath) {
    throw new Error('Chromium не найден. Установите chromium или задайте CHROMIUM_PATH');
  }

  const browser = await puppeteer.default.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '20mm', right: '15mm' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export interface IdRegistryRow {
  number: number;
  docType: string;
  docNumber: string;
  docName: string;
  sheetFrom: number;
  sheetTo: number;
  totalSheets: number;
  status: string;
}

export interface IdRegistryPdfData {
  registryName: string;
  contractNumber: string;
  projectName: string;
  projectAddress: string;
  generatedAt: string;
  rows: IdRegistryRow[];
  totalSheets: number;
}

// Кэш шаблона: Promise гарантирует однократное чтение даже при параллельных запросах
let templatePromise: Promise<ReturnType<typeof Handlebars.compile>> | null = null;

function getTemplate(): Promise<ReturnType<typeof Handlebars.compile>> {
  if (!templatePromise) {
    const templatePath = path.join(process.cwd(), 'templates', 'id-registry.hbs');
    templatePromise = fs.promises
      .readFile(templatePath, 'utf-8')
      .then((source) => Handlebars.compile(source));
  }
  return templatePromise;
}

export async function generateIdRegistryPdf(data: IdRegistryPdfData): Promise<Buffer> {
  const template = await getTemplate();
  const html = template(data);
  return htmlToPdf(html);
}
