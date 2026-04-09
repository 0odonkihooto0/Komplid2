import { logger } from '@/lib/logger';

/** Максимальная длина текста для одного запроса к YandexGPT */
const MAX_CHUNK_LENGTH = 16000;

/** Извлечение текста из PDF для отправки в YandexGPT */
export async function extractPdfText(buffer: Buffer): Promise<string[]> {
  // Полифилл DOMMatrix — pdfjs-dist обращается к нему при инициализации в Node.js.
  // Нативного DOMMatrix в Node.js нет, без полифилла будет ReferenceError.
  if (typeof globalThis.DOMMatrix === 'undefined') {
    (globalThis as Record<string, unknown>).DOMMatrix = class DOMMatrix {};
  }
  // Динамический импорт: не выполняется при загрузке модуля (moduleLoad), только при вызове функции.
  // Это предотвращает крэш /start route на этапе requirePage.
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  const text = result.text ?? '';

  if (!text || text.trim().length === 0) {
    logger.warn('PDF не содержит извлекаемого текста (возможно, скан)');
    await parser.destroy();
    return [];
  }

  logger.info(
    { textLength: text.length },
    'PDF текст извлечён'
  );

  await parser.destroy();

  // Убираем служебные строки перед отправкой в AI
  const cleanedText = filterPdfEstimateText(text);

  // Разбиваем на чанки по абзацам, стараясь не разрывать строки таблиц
  return splitTextIntoChunks(cleanedText, MAX_CHUNK_LENGTH);
}

/**
 * Фильтрация служебных строк PDF-сметы перед отправкой в AI.
 * Убирает пустые строки и итоговые строки типа "Итого", "НДС" и т.д.
 */
function filterPdfEstimateText(text: string): string {
  const servicePatterns = [
    /^итого/i,
    /^всего/i,
    /^ндс/i,
    /^накладные/i,
    /^сметная прибыль/i,
    /^лимитированные/i,
    /^непредвиденные/i,
  ];

  return text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return false;
      if (servicePatterns.some((p) => p.test(trimmed))) return false;
      return trimmed.length > 2;
    })
    .join('\n');
}

/** Разбиение текста на чанки, стараясь разрезать по пустым строкам */
function splitTextIntoChunks(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + 2 > maxLength) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
      }
      if (paragraph.length > maxLength) {
        const lines = paragraph.split('\n');
        currentChunk = '';
        for (const line of lines) {
          if (currentChunk.length + line.length + 1 > maxLength) {
            if (currentChunk.length > 0) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = line + '\n';
          } else {
            currentChunk += line + '\n';
          }
        }
      } else {
        currentChunk = paragraph + '\n\n';
      }
    } else {
      currentChunk += paragraph + '\n\n';
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
