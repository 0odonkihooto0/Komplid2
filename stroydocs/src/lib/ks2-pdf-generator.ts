import Handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';


// Регистрация хелперов (если не зарегистрированы)
try {
  Handlebars.registerHelper('addOne', (index: number) => index + 1);
} catch {
  // Хелпер уже зарегистрирован
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
      landscape: true, // КС-2 обычно в альбомной ориентации
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '20mm', right: '15mm' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

// Кэш шаблонов: Promise гарантирует однократное чтение файла даже при параллельных запросах
const templateCache = new Map<string, Promise<ReturnType<typeof Handlebars.compile>>>();

function getTemplate(name: string): Promise<ReturnType<typeof Handlebars.compile>> {
  if (!templateCache.has(name)) {
    const templatePath = path.join(process.cwd(), 'templates', name);
    templateCache.set(
      name,
      fs.promises.readFile(templatePath, 'utf-8').then((source) => Handlebars.compile(source))
    );
  }
  return templateCache.get(name)!;
}

export interface Ks2PdfData {
  number: string;
  contractNumber: string;
  projectName: string;
  projectAddress: string;
  contractorName: string;
  periodStart: string;
  periodEnd: string;
  items: Array<{
    name: string;
    unit: string;
    volume: number;
    unitPrice: number;
    totalPrice: number;
    laborCost: number;
    materialCost: number;
  }>;
  totalAmount: string;
  laborCost: string;
  totalAmountWords: string;
  participants: Array<{
    role: string;
    organizationName: string;
    representativeName: string;
    position: string;
  }>;
}

export interface Ks3PdfData {
  ks2Number: string;
  contractNumber: string;
  projectName: string;
  projectAddress: string;
  contractorName: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: string;
  totalAmountWords: string;
  participants: Array<{
    role: string;
    organizationName: string;
    representativeName: string;
    position: string;
  }>;
}

/** Сгенерировать PDF акта КС-2 */
export async function generateKs2Pdf(data: Ks2PdfData): Promise<Buffer> {
  const template = await getTemplate('ks2.hbs');
  const html = template(data);
  return htmlToPdf(html);
}

/** Сгенерировать PDF справки КС-3 */
export async function generateKs3Pdf(data: Ks3PdfData): Promise<Buffer> {
  const template = await getTemplate('ks3.hbs');
  const html = template(data);
  return htmlToPdf(html);
}
