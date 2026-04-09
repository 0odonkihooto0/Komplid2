import { EstimateFormat } from '@prisma/client';

/** Определение формата файла сметы по MIME-типу и содержимому */
export function detectFormatByMime(
  fileName: string,
  mimeType: string
): EstimateFormat | null {
  const ext = fileName.toLowerCase().split('.').pop();

  if (
    ext === 'xlsx' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return EstimateFormat.EXCEL;
  }

  if (ext === 'pdf' || mimeType === 'application/pdf') {
    return EstimateFormat.PDF;
  }

  if (ext === 'xml' || mimeType === 'application/xml' || mimeType === 'text/xml') {
    // Точный формат XML определяется после парсинга содержимого
    return EstimateFormat.XML_GRAND_SMETA;
  }

  return null;
}

/** Определение конкретного формата XML по содержимому корневого элемента */
export function detectXmlFormat(xmlContent: string): EstimateFormat {
  // РИК использует namespace rik:
  if (xmlContent.includes('rik:') || xmlContent.includes('xmlns:rik')) {
    return EstimateFormat.XML_RIK;
  }
  return EstimateFormat.XML_GRAND_SMETA;
}
