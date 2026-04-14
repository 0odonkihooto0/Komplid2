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
      landscape: false,
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '25mm', right: '15mm' },
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

export interface KsActParticipant {
  role: string;
  orgName: string;
  inn?: string;
  representative?: string;
  position?: string;
  order?: string;
}

export interface KsActIndicator {
  name: string;
  unit: string;
  designValue?: string;
  actualValue?: string;
}

export interface KsActWorkItem {
  name: string;
  unit?: string;
  volume?: string;
  note?: string;
}

export interface KsActCommissionMember {
  name: string;
  position?: string;
  role?: string;
  orgName?: string;
}

export interface Ks11PdfData {
  number: string;
  documentDate?: string;
  projectName: string;
  projectAddress?: string;
  contractNumber: string;
  // п.1-2: из участников договора
  developerName?: string;
  contractorName?: string;
  // п.3
  designOrg?: string;
  designOrgInn?: string;
  // п.7
  objectDesc?: string;
  totalArea?: string;
  buildingVolume?: string;
  floorCount?: string;
  constructionClass?: string;
  // п.9
  startDate?: string;
  endDate?: string;
  // п.11
  deviations?: string;
  // п.12
  constructionCost?: string;
  actualCost?: string;
  // п.14
  documents?: string;
  // п.15
  conclusion?: string;
  // Табличные разделы
  participants: KsActParticipant[];
  indicators: KsActIndicator[];
  workList: KsActWorkItem[];
}

export interface Ks14PdfData extends Ks11PdfData {
  commissionMembers: KsActCommissionMember[];
}

/** Сгенерировать PDF акта КС-11 */
export async function generateKs11Pdf(data: Ks11PdfData): Promise<Buffer> {
  const template = await getTemplate('ks11.hbs');
  const html = template(data);
  return htmlToPdf(html);
}

/** Сгенерировать PDF акта КС-14 */
export async function generateKs14Pdf(data: Ks14PdfData): Promise<Buffer> {
  const template = await getTemplate('ks14.hbs');
  const html = template(data);
  return htmlToPdf(html);
}
