import type { ExecutionDocType, IdCategory } from '@prisma/client';

/** Автоклассификация ИД по ГОСТ Р 70108-2025 (п. 5.2) */
export function classifyExecutionDoc(type: ExecutionDocType): IdCategory {
  switch (type) {
    case 'OZR':
    case 'KS_6A':
      return 'ACCOUNTING_JOURNAL';
    case 'AOSR':
    case 'TECHNICAL_READINESS_ACT':
    case 'KS_11':
    case 'KS_14':
      return 'INSPECTION_ACT';
    case 'GENERAL_DOCUMENT':
    default:
      return 'OTHER_ID';
  }
}
