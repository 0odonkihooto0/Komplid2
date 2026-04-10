/**
 * PDF-генератор листа согласования карточки ДО (Документооборот СЭД).
 * Паттерн: sk-pdf-generator.ts (Promise-кэш шаблона, Puppeteer).
 */

import Handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';

try {
  Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
} catch {
  // уже зарегистрирован
}

// ─── Puppeteer HTML → PDF ──────────────────────────────────────────────────

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

// ─── Интерфейс данных ──────────────────────────────────────────────────────

export interface ApprovalSheetStep {
  stepNumber: number;
  participantName: string;
  status: string;
  comment?: string;
  decidedAt?: string;
}

export interface ApprovalSheetPdfData {
  workflowNumber: string;
  workflowType: string;
  documentTitle: string;
  documentNumber: string;
  initiatorName: string;
  createdAt: string;
  completedAt?: string;
  steps: ApprovalSheetStep[];
  generatedAt: string;
}

// ─── Кэш шаблона (Promise — однократное чтение при параллельных запросах) ──

let approvalSheetTemplatePromise: Promise<ReturnType<typeof Handlebars.compile>> | null = null;

function getApprovalSheetTemplate(): Promise<ReturnType<typeof Handlebars.compile>> {
  if (!approvalSheetTemplatePromise) {
    const p = path.join(process.cwd(), 'templates', 'sed', 'approval-sheet.hbs');
    approvalSheetTemplatePromise = fs.promises
      .readFile(p, 'utf-8')
      .then((src) => Handlebars.compile(src));
  }
  return approvalSheetTemplatePromise;
}

// ─── Публичная функция генерации ───────────────────────────────────────────

export async function generateApprovalSheetPdf(data: ApprovalSheetPdfData): Promise<Buffer> {
  const template = await getApprovalSheetTemplate();
  const html = template(data);
  return htmlToPdf(html);
}
