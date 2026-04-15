/**
 * PDF-генератор документов Строительного контроля (Модуль 11).
 * Паттерн: id-registry-generator.ts (Promise-кэш шаблонов, Puppeteer).
 */

import Handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';

try {
  Handlebars.registerHelper('addOne', (index: number) => index + 1);
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

// ─── Интерфейсы данных ─────────────────────────────────────────────────────

export interface SkDefectRow {
  number: number;
  category: string;
  description: string;
  deadline: string;
  requiresSuspension: boolean;
}

export interface InspectionActPdfData {
  number: string;
  objectName: string;
  objectAddress: string;
  inspectedAt: string;       // дата проверки (локализованная строка)
  inspectorName: string;
  inspectorOrg: string;
  responsibleName: string;
  contractorPresent: boolean | null;
  defects: SkDefectRow[];
  generatedAt: string;
}

export interface PrescriptionDefectRow {
  number: number;
  description: string;
  category: string;
  deadline: string;
}

export interface PrescriptionPdfData {
  type: 'UN' | 'PR';         // DEFECT_ELIMINATION → UN, WORK_SUSPENSION → PR
  number: string;
  objectName: string;
  objectAddress: string;
  issuedAt: string;
  deadline: string;
  inspectorName: string;
  responsibleName: string;
  suspensionGrounds?: string; // только для PR
  defects: PrescriptionDefectRow[];
  generatedAt: string;
}

export interface RemediationDefectRow {
  number: number;
  description: string;
  measures: string;           // мероприятия по устранению
  notes: string;
}

export interface RemediationActPdfData {
  number: string;
  prescriptionNumber: string;
  objectName: string;
  objectAddress: string;
  issuedAt: string;
  inspectorName: string;
  defects: RemediationDefectRow[];
  generatedAt: string;
}

// ─── Кэш шаблонов (Promise — однократное чтение при параллельных запросах) ─

let inspectionActTemplatePromise: Promise<ReturnType<typeof Handlebars.compile>> | null = null;
let prescriptionUnTemplatePromise: Promise<ReturnType<typeof Handlebars.compile>> | null = null;
let prescriptionPrTemplatePromise: Promise<ReturnType<typeof Handlebars.compile>> | null = null;
let remediationActTemplatePromise: Promise<ReturnType<typeof Handlebars.compile>> | null = null;

function getInspectionActTemplate(): Promise<ReturnType<typeof Handlebars.compile>> {
  if (!inspectionActTemplatePromise) {
    const p = path.join(process.cwd(), 'templates', 'sk', 'inspection-act.hbs');
    inspectionActTemplatePromise = fs.promises
      .readFile(p, 'utf-8')
      .then((src) => Handlebars.compile(src));
  }
  return inspectionActTemplatePromise;
}

function getPrescriptionUnTemplate(): Promise<ReturnType<typeof Handlebars.compile>> {
  if (!prescriptionUnTemplatePromise) {
    const p = path.join(process.cwd(), 'templates', 'sk', 'prescription-un.hbs');
    prescriptionUnTemplatePromise = fs.promises
      .readFile(p, 'utf-8')
      .then((src) => Handlebars.compile(src));
  }
  return prescriptionUnTemplatePromise;
}

function getPrescriptionPrTemplate(): Promise<ReturnType<typeof Handlebars.compile>> {
  if (!prescriptionPrTemplatePromise) {
    const p = path.join(process.cwd(), 'templates', 'sk', 'prescription-pr.hbs');
    prescriptionPrTemplatePromise = fs.promises
      .readFile(p, 'utf-8')
      .then((src) => Handlebars.compile(src));
  }
  return prescriptionPrTemplatePromise;
}

function getRemediationActTemplate(): Promise<ReturnType<typeof Handlebars.compile>> {
  if (!remediationActTemplatePromise) {
    const p = path.join(process.cwd(), 'templates', 'sk', 'remediation-act.hbs');
    remediationActTemplatePromise = fs.promises
      .readFile(p, 'utf-8')
      .then((src) => Handlebars.compile(src));
  }
  return remediationActTemplatePromise;
}

// ─── Публичные функции генерации ───────────────────────────────────────────

export async function generateInspectionActPdf(data: InspectionActPdfData): Promise<Buffer> {
  const template = await getInspectionActTemplate();
  const html = template(data);
  return htmlToPdf(html);
}

/**
 * Генерирует PDF предписания.
 * Выбирает шаблон по data.type: 'UN' → prescription-un.hbs, 'PR' → prescription-pr.hbs
 */
export async function generatePrescriptionPdf(data: PrescriptionPdfData): Promise<Buffer> {
  const template = data.type === 'UN'
    ? await getPrescriptionUnTemplate()
    : await getPrescriptionPrTemplate();
  const html = template(data);
  return htmlToPdf(html);
}

export async function generateRemediationActPdf(data: RemediationActPdfData): Promise<Buffer> {
  const template = await getRemediationActTemplate();
  const html = template(data);
  return htmlToPdf(html);
}

// ─── HTML-рендер без Puppeteer (для экспорта с последующим merge через pdf-lib) ─

export async function renderInspectionActHtml(data: InspectionActPdfData): Promise<string> {
  const template = await getInspectionActTemplate();
  return template(data);
}

export async function renderPrescriptionHtml(data: PrescriptionPdfData): Promise<string> {
  const template = data.type === 'UN'
    ? await getPrescriptionUnTemplate()
    : await getPrescriptionPrTemplate();
  return template(data);
}

export async function renderRemediationActHtml(data: RemediationActPdfData): Promise<string> {
  const template = await getRemediationActTemplate();
  return template(data);
}

// ─── Реестр дефектов (сводный PDF) ────────────────────────────────────────────

export interface DefectsListPdfData {
  objectName: string;
  generatedAt: string;
  defects: Array<{
    number: number;
    title: string;
    category: string;
    status: string;
    deadline: string;
    responsible: string;
  }>;
}

let defectsListTemplatePromise: Promise<ReturnType<typeof Handlebars.compile>> | null = null;

function getDefectsListTemplate(): Promise<ReturnType<typeof Handlebars.compile>> {
  if (!defectsListTemplatePromise) {
    const p = path.join(process.cwd(), 'templates', 'sk', 'defects-list.hbs');
    defectsListTemplatePromise = fs.promises
      .readFile(p, 'utf-8')
      .then((src) => Handlebars.compile(src));
  }
  return defectsListTemplatePromise;
}

export async function generateDefectsListPdf(data: DefectsListPdfData): Promise<Buffer> {
  const template = await getDefectsListTemplate();
  const html = template(data);
  return htmlToPdf(html);
}
