import Handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';
import { db } from '@/lib/db';

// ────────────────────────────────────────────────────────────────────────────
// Генерация PDF отчёта через Handlebars + Puppeteer.
// Паттерн аналогичен ks2-pdf-generator.ts: кэш шаблонов + регистрация партиалов.
// ────────────────────────────────────────────────────────────────────────────

// ─── Handlebars хелперы ──────────────────────────────────────────────────────

try {
  // Индекс с единицы для нумерации строк таблиц
  Handlebars.registerHelper('addOne', (index: number) => index + 1);
} catch { /* уже зарегистрирован */ }

try {
  // Форматирование даты: ISO-строка или Date → dd.mm.yyyy
  Handlebars.registerHelper('formatDate', (value: unknown) => {
    if (!value) return '—';
    try {
      return new Date(value as string).toLocaleDateString('ru-RU');
    } catch {
      return String(value);
    }
  });
} catch { /* уже зарегистрирован */ }

try {
  // Форматирование чисел: 1234567.89 → "1 234 567,89"
  Handlebars.registerHelper('formatNumber', (value: unknown) => {
    if (value === null || value === undefined) return '0';
    const num = Number(value);
    if (isNaN(num)) return String(value);
    return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  });
} catch { /* уже зарегистрирован */ }

try {
  // Проверка равенства для условных блоков: {{#if (eq type "TITLE_PAGE")}}
  Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
} catch { /* уже зарегистрирован */ }

try {
  // Проверка больше чем: {{#if (gt deviationDays 0)}}
  Handlebars.registerHelper('gt', (a: unknown, b: unknown) => Number(a) > Number(b));
} catch { /* уже зарегистрирован */ }

// ─── Кэш шаблонов ────────────────────────────────────────────────────────────

// Promise-кэш гарантирует однократное чтение файла даже при параллельных запросах
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

// ─── Регистрация партиалов ────────────────────────────────────────────────────

// Партиалы инициализируются один раз при первом вызове generateReportPdf
let partialsRegistered = false;

async function ensurePartialsRegistered(): Promise<void> {
  if (partialsRegistered) return;
  partialsRegistered = true;

  const blockPartials: Array<[string, string]> = [
    ['title-page',      'reports/blocks/title-page.hbs'],
    ['work-volumes',    'reports/blocks/work-volumes.hbs'],
    ['ks2-acts',        'reports/blocks/ks2-acts.hbs'],
    ['id-status',       'reports/blocks/id-status.hbs'],
    ['defects-summary', 'reports/blocks/defects-summary.hbs'],
    ['gpr-progress',    'reports/blocks/gpr-progress.hbs'],
    ['photo-report',    'reports/blocks/photo-report.hbs'],
    ['free-text',       'reports/blocks/free-text.hbs'],
  ];

  await Promise.all(
    blockPartials.map(async ([partialName, filePath]) => {
      const fullPath = path.join(process.cwd(), 'templates', filePath);
      const source = await fs.promises.readFile(fullPath, 'utf-8');
      Handlebars.registerPartial(partialName, source);
    })
  );
}

// ─── Puppeteer ────────────────────────────────────────────────────────────────

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
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '20mm', right: '15mm' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

// ─── Публичная функция ────────────────────────────────────────────────────────

/**
 * Генерирует PDF для отчёта по его ID.
 * Загружает отчёт со всеми блоками из БД, рендерит через Handlebars + Puppeteer.
 */
export async function generateReportPdf(reportId: string): Promise<Buffer> {
  const report = await db.report.findUnique({
    where: { id: reportId },
    include: {
      blocks: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!report) {
    throw new Error(`Отчёт ${reportId} не найден`);
  }

  // Регистрируем партиалы и загружаем главный шаблон параллельно
  const [template] = await Promise.all([
    getTemplate('reports/report.hbs'),
    ensurePartialsRegistered(),
  ]);

  // Формируем данные для шаблона: блоки с content как обычный объект
  const templateData = {
    number: report.number,
    name: report.name,
    periodStart: report.periodStart?.toISOString() ?? null,
    periodEnd: report.periodEnd?.toISOString() ?? null,
    blocks: report.blocks.map((block) => ({
      type: block.type,
      title: block.title,
      content: (block.content as Record<string, unknown>) ?? {},
    })),
  };

  const html = template(templateData);
  return htmlToPdf(html);
}
