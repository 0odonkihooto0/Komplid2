/**
 * PDF-генератор для документов модуля ПИР.
 * Использует Handlebars-шаблоны из templates/pir/.
 * Шаблоны кэшируются как Promise (паттерн из sk-pdf-generator.ts).
 */

import Handlebars from 'handlebars';
import path from 'path';
import fs from 'fs/promises';
import { renderHtmlToPdf } from './pdf-generator';

// === Интерфейсы данных ===

export interface DesignTaskPdfData {
  number: string;
  date: string;
  isSurveyTask: boolean;
  approvedByName: string;
  agreedByName: string;
  /** Параметры задания из DesignTaskParam[] */
  parameters: { paramName: string; value: string }[];
  generatedAt: string;
}

export interface ClosureActPdfData {
  number: string;
  periodStart: string;
  periodEnd: string;
  contractorOrgName: string;
  customerOrgName: string;
  items: { workName: string; unit: string; volume: string; amount: string }[];
  totalAmount: string;
  generatedAt: string;
}

// === Promise-кэш шаблонов ===

let designTaskTemplatePromise: Promise<HandlebarsTemplateDelegate> | null = null;
let closureActTemplatePromise: Promise<HandlebarsTemplateDelegate> | null = null;

// Хелпер 'addOne' уже зарегистрирован в pdf-generator.ts при импорте renderHtmlToPdf.
// Регистрируем повторно (идемпотентно) для случая изолированного импорта этого модуля.
Handlebars.registerHelper('addOne', (i: number) => i + 1);

function getDesignTaskTemplate(): Promise<HandlebarsTemplateDelegate> {
  if (!designTaskTemplatePromise) {
    designTaskTemplatePromise = fs
      .readFile(path.join(process.cwd(), 'templates', 'pir', 'design-task.hbs'), 'utf-8')
      .then((src) => Handlebars.compile(src));
  }
  return designTaskTemplatePromise;
}

function getClosureActTemplate(): Promise<HandlebarsTemplateDelegate> {
  if (!closureActTemplatePromise) {
    closureActTemplatePromise = fs
      .readFile(path.join(process.cwd(), 'templates', 'pir', 'closure-act.hbs'), 'utf-8')
      .then((src) => Handlebars.compile(src));
  }
  return closureActTemplatePromise;
}

// === Публичные функции генерации ===

/** Генерация PDF Задания на проектирование (DESIGN) или на изыскания (SURVEY) */
export async function generateDesignTaskPdf(data: DesignTaskPdfData): Promise<Buffer> {
  const tpl = await getDesignTaskTemplate();
  return renderHtmlToPdf(tpl(data));
}

/** Генерация PDF Акта закрытия ПИР */
export async function generateClosureActPdf(data: ClosureActPdfData): Promise<Buffer> {
  const tpl = await getClosureActTemplate();
  return renderHtmlToPdf(tpl(data));
}
