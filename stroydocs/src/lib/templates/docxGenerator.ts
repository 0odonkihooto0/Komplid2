/**
 * Сервис генерации .docx документов на основе шаблонов с плейсхолдерами.
 *
 * Шаблоны хранятся в templates/docx/*.docx.
 * Плейсхолдеры заменяются через docxtemplater + pizzip.
 * Маппинг полей описан в templates/docx/README.md.
 */

import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import path from 'path';
import fs from 'fs';
import type { DocxTemplateName } from '@/types/templates';

/** Ошибка при отсутствии или повреждении шаблона */
export class TemplateNotFoundError extends Error {
  constructor(templateName: string) {
    super(`Шаблон не найден: templates/docx/${templateName}.docx`);
    this.name = 'TemplateNotFoundError';
  }
}

/** Ошибка при подстановке данных в шаблон */
export class TemplateRenderError extends Error {
  constructor(templateName: string, cause: unknown) {
    super(
      `Ошибка рендера шаблона ${templateName}: ${cause instanceof Error ? cause.message : String(cause)}`
    );
    this.name = 'TemplateRenderError';
  }
}

/**
 * Загружает .docx-шаблон из templates/docx/, подставляет данные
 * через docxtemplater и возвращает заполненный документ как Buffer.
 *
 * @param templateName - имя шаблона без расширения (например 'aosr', 'ozr')
 * @param data - объект с данными; ключи = плейсхолдеры в шаблоне ({ключ})
 * @returns Buffer с содержимым заполненного .docx
 *
 * @example
 * const buf = await generateDocx('aosr', { '№': '42', object: 'ЖК Центральный', ... });
 * res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
 * res.send(buf);
 */
export async function generateDocx(
  templateName: DocxTemplateName | string,
  data: Record<string, string>
): Promise<Buffer> {
  const templatePath = path.join(
    process.cwd(),
    'templates',
    'docx',
    `${templateName}.docx`
  );

  if (!fs.existsSync(templatePath)) {
    throw new TemplateNotFoundError(templateName);
  }

  let content: string;
  try {
    content = fs.readFileSync(templatePath, 'binary');
  } catch {
    throw new TemplateNotFoundError(templateName);
  }

  try {
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.render(data);

    return doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    }) as Buffer;
  } catch (err) {
    throw new TemplateRenderError(templateName, err);
  }
}
