import Handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';

// Регистрируем хелперы (try/catch — на случай повторной регистрации)
try {
  Handlebars.registerHelper('formatDate', (value: unknown) => {
    if (!value) return '—';
    try {
      return new Date(value as string).toLocaleDateString('ru-RU');
    } catch {
      return String(value);
    }
  });
} catch {
  // Уже зарегистрирован
}

try {
  Handlebars.registerHelper('formatMoney', (value: unknown) => {
    if (value === null || value === undefined) return '—';
    const num = Number(value);
    if (isNaN(num)) return '—';
    return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  });
} catch {
  // Уже зарегистрирован
}

// Puppeteer: генерация PDF из HTML-строки
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
      margin: { top: '15mm', bottom: '15mm', left: '20mm', right: '15mm' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

// Кэш шаблонов: Promise гарантирует однократное чтение даже при параллельных запросах
const templateCache = new Map<string, Promise<ReturnType<typeof Handlebars.compile>>>();

function getTemplate(name: string): Promise<ReturnType<typeof Handlebars.compile>> {
  if (!templateCache.has(name)) {
    const templatePath = path.join(process.cwd(), 'templates', name);
    templateCache.set(
      name,
      fs.promises.readFile(templatePath, 'utf-8').then((source) => Handlebars.compile(source)),
    );
  }
  return templateCache.get(name)!;
}

export interface InfoReportPdfData {
  // Шапка
  formationDate: string; // "10 апреля 2026 г."
  programPoint: string; // Пункт программы (или пустая строка)
  orderNumber: string; // Порядковый номер (или пустая строка)
  // Объект
  objectName: string;
  shortName: string;
  // Участники
  customer: string;
  responsibleExecutor: string;
  // Финансирование
  fundingYear: string;
  budgetAllocated: string;
  extraBudget: string;
  // Сроки
  plannedStartDate: string;
  plannedEndDate: string;
  deviationText: string;
  // Стадии реализации
  stages: {
    ird: boolean;
    pir: boolean;
    expertise: boolean;
    smr: boolean;
    commissioning: boolean;
  };
  // ПИР
  pirContractor: string;
  pirTotalAmount: string;
  pirEndDate: string;
  pirReadiness: string; // "75%" или "—"
  pirReadinessNum: number | null; // числовое значение для progress-bar (0–100)
  pirDynamics: string;
  // СМР
  smrContractor: string;
  smrTotalAmount: string;
  smrEndDate: string;
  smrReadiness: string;
  smrReadinessNum: number | null;
  smrDynamics: string;
  // Проблемные вопросы
  problems: string;
  // Ситуация на объекте
  workersCount: string;
  workersDynamics: string;
  equipmentCount: string;
  equipmentDynamics: string;
}

/** Сгенерировать PDF информационного отчёта по объекту */
export async function generateInfoReportPdf(data: InfoReportPdfData): Promise<Buffer> {
  const template = await getTemplate('info-report.hbs');
  const html = template(data);
  return htmlToPdf(html);
}
