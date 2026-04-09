/**
 * Создаёт минимально валидные .docx-файлы для шаблонов ИД.
 *
 * .docx — это ZIP-архив, содержащий XML-файлы Word Open XML.
 * Используем PizZip для создания архива из raw XML без Puppeteer/LibreOffice.
 * Плейсхолдеры {field} затем подставляются через docxtemplater.
 */

import PizZip from 'pizzip';
import path from 'path';
import fs from 'fs';

/** Минимальный XML для Content_Types */
const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

/** Корневые связи */
const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
</Relationships>`;

/** Связи документа (пустые) */
const WORD_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

/** Создать XML тела документа Word из массива параграфов */
function makeDocumentXml(paragraphs: string[]): string {
  const paras = paragraphs
    .map(
      (text) =>
        `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>
    ${paras}
    <w:sectPr/>
  </w:body>
</w:document>`;
}

/** Создать .docx Buffer из XML параграфов */
function createDocxBuffer(paragraphs: string[]): Buffer {
  const zip = new PizZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES);
  zip.file('_rels/.rels', ROOT_RELS);
  zip.file('word/document.xml', makeDocumentXml(paragraphs));
  zip.file('word/_rels/document.xml.rels', WORD_RELS);

  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer;
}

interface TemplateDefinition {
  filename: string;
  paragraphs: string[];
}

/** Определения шаблонов с плейсхолдерами docxtemplater */
const TEMPLATES: TemplateDefinition[] = [
  {
    filename: 'ozr.docx',
    paragraphs: [
      'ОБЩИЙ ЖУРНАЛ РАБОТ № {number}',
      'от {date}',
      '',
      'Объект: {projectName}',
      'Адрес: {projectAddress}',
      'Договор: {contractNumber}',
      '',
      'РАЗДЕЛ 3. ПЕРЕЧЕНЬ ВЫПОЛНЕННЫХ РАБОТ:',
      '{section3Text}',
      '',
      'РАЗДЕЛ 5. СВЕДЕНИЯ О КОНТРОЛЕ КАЧЕСТВА:',
      '{section5Text}',
      '',
      'Подрядчик: ___________________________',
      'Заказчик: ___________________________',
    ],
  },
  {
    filename: 'ks2.docx',
    paragraphs: [
      'АКТ О ПРИЁМКЕ ВЫПОЛНЕННЫХ РАБОТ (КС-2)',
      '',
      'Объект: {object}',
      'Договор № {contractNumber}',
      'Отчётный период: с {periodFrom} по {periodTo}',
      '',
      'Наименование работ / Единица / Объём / Цена / Сумма',
      '{worksList}',
      '',
      'ИТОГО: {totalAmount} руб.',
      '',
      'Сдал: ___________________________',
      'Принял: ___________________________',
    ],
  },
  {
    filename: 'ks3.docx',
    paragraphs: [
      'СПРАВКА О СТОИМОСТИ ВЫПОЛНЕННЫХ РАБОТ И ЗАТРАТ (КС-3)',
      '',
      'Объект: {object}',
      'Договор № {contractNumber}',
      'Отчётный период: с {periodFrom} по {periodTo}',
      '',
      'Стоимость выполненных работ: {totalAmount} руб.',
      '',
      'Подрядчик: ___________________________',
      'Заказчик: ___________________________',
    ],
  },
  {
    filename: 'avk.docx',
    paragraphs: [
      'АКТ ВХОДНОГО КОНТРОЛЯ (АВК)',
      '',
      'Объект: {object}',
      'Дата: {date}',
      '',
      'Материал: {material}',
      'Номер партии: {batchNumber}',
      'Поставщик: {supplier}',
      '',
      'Результат контроля: {result}',
      'Замечания: {remarks}',
      '',
      'Инспектор: ___________________________',
    ],
  },
  {
    filename: 'zhvk.docx',
    paragraphs: [
      'ЖУРНАЛ ВХОДНОГО КОНТРОЛЯ (ЖВК)',
      '',
      'Объект: {object}',
      '',
      'Дата | Материал | Партия | Результат | Замечания',
      '{date} | {material} | {batchNumber} | {result} | {remarks}',
      '',
      'Ответственный: ___________________________',
    ],
  },
];

/** Создать все недостающие шаблоны .docx */
export async function createMissingDocxTemplates(): Promise<void> {
  const docxDir = path.join(process.cwd(), 'templates', 'docx');

  if (!fs.existsSync(docxDir)) {
    fs.mkdirSync(docxDir, { recursive: true });
  }

  for (const tpl of TEMPLATES) {
    const filePath = path.join(docxDir, tpl.filename);

    if (fs.existsSync(filePath)) {
      console.log(`  ⏭  ${tpl.filename} — уже существует, пропускаем`);
      continue;
    }

    const buffer = createDocxBuffer(tpl.paragraphs);
    fs.writeFileSync(filePath, buffer);
    console.log(`  ✅ ${tpl.filename} создан (${buffer.length} байт)`);
  }
}
