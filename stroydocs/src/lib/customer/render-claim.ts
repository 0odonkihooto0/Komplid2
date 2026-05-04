/**
 * Рендеринг Handlebars-шаблонов претензий для B2C-заказчиков.
 * Шаблоны расположены в templates/claims/<тип>.hbs.
 * Кэш шаблонов: Promise гарантирует однократное чтение файла
 * даже при параллельных запросах (паттерн из ks2-pdf-generator.ts).
 */

import Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import type { ClaimType } from '@prisma/client';

export interface ClaimTemplateData {
  recipientName: string;
  senderName: string;
  senderAddress?: string;
  contractNumber?: string;
  contractDate?: string;
  issueDescription: string;
  requestedAction: string;
  deadline?: string;
  today: string;
}

// Кэш скомпилированных шаблонов: Promise обеспечивает однократное чтение
// даже при одновременных параллельных вызовах renderClaim
const templateCache = new Map<string, Promise<HandlebarsTemplateDelegate>>();

/**
 * Получить или загрузить шаблон для заданного типа претензии.
 * Имя файла: lowercase-kebab вариант ClaimType enum.
 * Пример: QUALITY_ISSUE → quality-issue.hbs
 */
function getClaimTemplate(type: ClaimType): Promise<HandlebarsTemplateDelegate> {
  if (!templateCache.has(type)) {
    const fileName = `${type.toLowerCase().replace(/_/g, '-')}.hbs`;
    const filePath = path.join(process.cwd(), 'templates', 'claims', fileName);

    templateCache.set(
      type,
      fs.promises
        .readFile(filePath, 'utf-8')
        .then((source) => Handlebars.compile(source))
    );
  }

  return templateCache.get(type)!;
}

/**
 * Рендеринг HTML претензии по шаблону.
 *
 * @param type  Тип претензии (ClaimType из Prisma)
 * @param data  Данные для подстановки в шаблон
 * @returns     HTML-строка готовой претензии
 */
export async function renderClaim(
  type: ClaimType,
  data: ClaimTemplateData
): Promise<string> {
  const template = await getClaimTemplate(type);
  return template(data);
}
