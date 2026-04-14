import Handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';
import type { SpecialJournalType } from '@prisma/client';

// Регистрация хелперов (если не зарегистрированы)
try {
  Handlebars.registerHelper('addOne', (index: number) => index + 1);
} catch {
  // Хелпер уже зарегистрирован
}

// Маппинг типа журнала → файл шаблона
const TEMPLATE_MAP: Record<SpecialJournalType, string> = {
  CONCRETE_WORKS: 'journals/journal-concrete.hbs',
  WELDING_WORKS: 'journals/journal-welding.hbs',
  AUTHOR_SUPERVISION: 'journals/journal-supervision.hbs',
  MOUNTING_WORKS: 'journals/journal-generic.hbs',
  ANTICORROSION: 'journals/journal-generic.hbs',
  GEODETIC: 'journals/journal-generic.hbs',
  EARTHWORKS: 'journals/journal-generic.hbs',
  PILE_DRIVING: 'journals/journal-generic.hbs',
  CABLE_LAYING: 'journals/journal-generic.hbs',
  FIRE_SAFETY: 'journals/journal-generic.hbs',
  // Расширение ЦУС (2026-04-14) — все используют универсальный шаблон
  OZR_1026PR: 'journals/journal-generic.hbs',
  OZR_RD_11_05: 'journals/journal-generic.hbs',
  INPUT_CONTROL: 'journals/journal-generic.hbs',
  CONSTRUCTION_CONTROL: 'journals/journal-generic.hbs',
  CONSTRUCTION_CONTROL_V2: 'journals/journal-generic.hbs',
  SK_CALL_REGISTER: 'journals/journal-generic.hbs',
  AUTHOR_SUPERVISION_2016: 'journals/journal-generic.hbs',
  DRILLING_WORKS: 'journals/journal-generic.hbs',
  CONCRETE_CURING: 'journals/journal-generic.hbs',
  JOINT_GROUTING: 'journals/journal-generic.hbs',
  ANTICORROSION_WELD: 'journals/journal-generic.hbs',
  BOLT_CONNECTIONS: 'journals/journal-generic.hbs',
  TORQUE_WRENCH_CALIBRATION: 'journals/journal-generic.hbs',
  CABLE_TUBE: 'journals/journal-generic.hbs',
  CABLE_ROUTE: 'journals/journal-generic.hbs',
  PIPELINE_WELDING: 'journals/journal-generic.hbs',
  INSULATION_LAYING: 'journals/journal-generic.hbs',
  TECHNICAL_LEVELING: 'journals/journal-generic.hbs',
  FIRE_SAFETY_INTRO: 'journals/journal-generic.hbs',
  GENERAL_INTRO_BRIEFING: 'journals/journal-generic.hbs',
  CUSTOM: 'journals/journal-generic.hbs',
};

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

/** Данные записи для PDF (общие поля) */
export interface JournalPdfEntry {
  entryNumber: number;
  date: string;
  description: string;
  location: string | null;
  normativeRef: string | null;
  weather: string | null;
  temperature: number | null;
  statusLabel: string;
  // Бетонные работы
  structureName?: string;
  concreteClass?: string;
  volume?: number;
  placementMethod?: string;
  mixTemperature?: number;
  curingMethod?: string;
  // Сварочные работы
  jointType?: string;
  baseMetal?: string;
  thickness?: number;
  electrodeMark?: string;
  weldingMethod?: string;
  welderStampNumber?: string;
  welderFullName?: string;
  controlType?: string;
  controlResult?: string;
  // Авторский надзор
  designOrgRepresentative?: string;
  deviationsFound?: string;
  instructions?: string;
  instructionDeadline?: string;
  implementationNote?: string;
}

/** Данные журнала для PDF */
export interface JournalPdfData {
  number: string;
  title: string;
  projectName: string;
  projectAddress: string;
  contractNumber: string | null;
  responsibleName: string;
  normativeRef: string | null;
  statusLabel: string;
  openedAt: string;
  closedAt: string | null;
  generatedAt: string;
  entries: JournalPdfEntry[];
}

/** Сгенерировать PDF журнала по типу */
export async function generateJournalPdf(
  type: SpecialJournalType,
  data: JournalPdfData
): Promise<Buffer> {
  const templateFile = TEMPLATE_MAP[type];
  const template = await getTemplate(templateFile);
  const html = template(data);
  return htmlToPdf(html);
}
