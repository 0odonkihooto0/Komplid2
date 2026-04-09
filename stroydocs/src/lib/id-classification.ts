import type { ExecutionDocType, IdCategory } from '@prisma/client';

/** Автоклассификация ИД по ГОСТ Р 70108-2025 (п. 5.2) */
export function classifyExecutionDoc(type: ExecutionDocType): IdCategory {
  switch (type) {
    case 'OZR':
      return 'ACCOUNTING_JOURNAL';
    case 'AOSR':
    case 'TECHNICAL_READINESS_ACT':
      return 'INSPECTION_ACT';
    default:
      return 'OTHER_ID';
  }
}
