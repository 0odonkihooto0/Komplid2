// Общие типы для системы штампов ПИР

export interface PdfStamp {
  id: string;
  entityType: string;
  entityId: string;
  s3Key: string;
  stampText: string;
  titleId: string | null;
  positionX: number; // нормализованное 0-1 (доля ширины страницы)
  positionY: number; // нормализованное 0-1 (доля высоты страницы)
  page: number;      // 0-based (API/БД); для отображения: page + 1
  width: number;     // пиксели, по умолчанию 200
  height: number;    // пиксели, по умолчанию 100
  createdAt: string;
  updatedAt: string;
}

export interface StampTitle {
  id: string;
  name: string;
  organizationId: string;
  template: string | null;
  createdAt: string;
}

export interface QrData {
  qrToken: string;
  verifyUrl: string;
}

export type QrTemplate = 'QR_ONLY' | 'QR_TITLE' | 'QR_DATE';

export const QR_TEMPLATE_LABELS: Record<QrTemplate, string> = {
  QR_ONLY: 'Только QR',
  QR_TITLE: 'QR + название документа',
  QR_DATE: 'QR + дата',
};

export interface QrStampPayload {
  type: 'QR';
  url: string;
  template: QrTemplate;
}

/** Проверяет, является ли штамп QR-штампом */
export function isQrStamp(stamp: PdfStamp): boolean {
  try {
    const parsed = JSON.parse(stamp.stampText) as Partial<QrStampPayload>;
    return parsed.type === 'QR';
  } catch {
    return false;
  }
}
