/**
 * Общие утилиты для XML-экспорта ИД по схемам Минстроя (ГОСТ Р 70108-2025)
 */

import type { Prisma } from '@prisma/client';
import { generateAosrXml } from './aosr-xml-generator';
import { generateOzrXml } from './ozr-xml-generator';

/** Маппинг ролей участников на русские названия */
export const PARTICIPANT_ROLE_LABELS_RU: Record<string, string> = {
  DEVELOPER: 'Застройщик',
  CONTRACTOR: 'Генподрядчик',
  SUBCONTRACTOR: 'Субподрядчик',
  SUPERVISION: 'Авторский надзор',
};

/** Форматирование даты в ISO формат для XML (YYYY-MM-DD) */
export function formatDateXml(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** Тип документа с полными связями для XML-генерации */
export type ExecutionDocForXml = Prisma.ExecutionDocGetPayload<{
  include: {
    contract: {
      include: {
        buildingObject: true;
        participants: {
          include: {
            organization: {
              select: { name: true; inn: true; ogrn: true };
            };
          };
        };
      };
    };
    workRecord: {
      include: {
        workItem: {
          select: {
            name: true;
            projectCipher: true;
            ksiNode: { select: { code: true; name: true } };
          };
        };
        writeoffs: {
          include: {
            material: {
              include: {
                documents: true;
              };
            };
          };
        };
      };
    };
    signatures: {
      include: {
        user: {
          select: { firstName: true; lastName: true; middleName: true };
        };
      };
    };
    createdBy: {
      select: { firstName: true; lastName: true; middleName: true };
    };
  };
}>;

/**
 * Роутер генерации XML — выбирает генератор по типу документа.
 * Поддерживаются AOSR и OZR. Для остальных типов выбрасывает ошибку.
 */
export function generateExecutionDocXml(doc: ExecutionDocForXml): string {
  switch (doc.type) {
    case 'AOSR':
      return generateAosrXml(doc);
    case 'OZR':
      return generateOzrXml(doc);
    default:
      throw new Error(`XML-экспорт не поддерживается для типа ${doc.type}`);
  }
}
