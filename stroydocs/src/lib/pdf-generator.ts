import Handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';
import type { ExecutionDocType } from '@prisma/client';
import type {
  AosrTemplateData,
  OzrTemplateData,
  TechReadinessTemplateData,
} from '@/types/templates';

// Маппинг типа документа на файл шаблона
const TEMPLATE_FILES: Record<ExecutionDocType, string> = {
  AOSR: 'aosr.hbs',
  OZR: 'ozr.hbs',
  TECHNICAL_READINESS_ACT: 'technical-readiness-act.hbs',
};

// Кэш скомпилированных шаблонов
const templateCache = new Map<string, ReturnType<typeof Handlebars.compile>>();

// Регистрация хелперов Handlebars
Handlebars.registerHelper('addOne', (index: number) => index + 1);

/** Загрузить и скомпилировать Handlebars-шаблон */
function getTemplate(docType: ExecutionDocType): ReturnType<typeof Handlebars.compile> {
  const cached = templateCache.get(docType);
  if (cached) return cached;

  const templatePath = path.join(process.cwd(), 'templates', TEMPLATE_FILES[docType]);
  const source = fs.readFileSync(templatePath, 'utf-8');
  const compiled = Handlebars.compile(source);
  templateCache.set(docType, compiled);
  return compiled;
}

/** Сгенерировать PDF из HTML через Puppeteer */
async function htmlToPdf(html: string): Promise<Buffer> {
  // Динамический импорт puppeteer-core
  const puppeteer = await import('puppeteer-core');

  // Поиск Chromium в системе
  const commonPaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/snap/bin/chromium',
  ];
  let executablePath = process.env.CHROMIUM_PATH;
  if (!executablePath) {
    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        executablePath = p;
        break;
      }
    }
  }
  if (!executablePath) {
    throw new Error(
      `Chromium не найден. Проверенные пути: ${commonPaths.join(', ')}. Установите chromium или задайте CHROMIUM_PATH`
    );
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
      margin: { top: '20mm', bottom: '20mm', left: '25mm', right: '15mm' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

type TemplateData = AosrTemplateData | OzrTemplateData | TechReadinessTemplateData;

/**
 * Рендерит HTML из Handlebars-шаблона без запуска Puppeteer.
 * Используется для загрузки контента в TipTap-редактор.
 */
export function renderExecutionDocHtml(docType: ExecutionDocType, data: TemplateData): string {
  const template = getTemplate(docType);
  return template(data);
}

/** Конвертирует HTML-строку в PDF через Puppeteer */
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  return htmlToPdf(html);
}

/**
 * Сгенерировать PDF исполнительного документа.
 * Если передан overrideHtml — рендерит его напрямую (иерархия приоритетов).
 */
export async function generateExecutionDocPdf(
  docType: ExecutionDocType,
  data: TemplateData,
  opts?: { overrideHtml?: string | null }
): Promise<Buffer> {
  // Приоритет 1: пользовательский HTML из TipTap-редактора
  if (opts?.overrideHtml) {
    return htmlToPdf(opts.overrideHtml);
  }
  // Приоритет 2/3: стандартный Handlebars-шаблон (overrideFields уже смёрджены в data на уровне роута)
  const template = getTemplate(docType);
  const html = template(data);
  return htmlToPdf(html);
}
