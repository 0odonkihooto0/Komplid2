import { describe, it, expect } from 'vitest';
import type { ExecutionDocType } from '@prisma/client';
import { classifyExecutionDoc } from '../id-classification';

describe('classifyExecutionDoc', () => {
  it('OZR → ACCOUNTING_JOURNAL', () => {
    expect(classifyExecutionDoc('OZR' as ExecutionDocType)).toBe('ACCOUNTING_JOURNAL');
  });

  it('KS_6A → ACCOUNTING_JOURNAL', () => {
    expect(classifyExecutionDoc('KS_6A' as ExecutionDocType)).toBe('ACCOUNTING_JOURNAL');
  });

  it('AOSR → INSPECTION_ACT', () => {
    expect(classifyExecutionDoc('AOSR' as ExecutionDocType)).toBe('INSPECTION_ACT');
  });

  it('TECHNICAL_READINESS_ACT → INSPECTION_ACT', () => {
    expect(classifyExecutionDoc('TECHNICAL_READINESS_ACT' as ExecutionDocType)).toBe('INSPECTION_ACT');
  });

  it('KS_11 → INSPECTION_ACT', () => {
    expect(classifyExecutionDoc('KS_11' as ExecutionDocType)).toBe('INSPECTION_ACT');
  });

  it('KS_14 → INSPECTION_ACT', () => {
    expect(classifyExecutionDoc('KS_14' as ExecutionDocType)).toBe('INSPECTION_ACT');
  });

  it('GENERAL_DOCUMENT → OTHER_ID', () => {
    expect(classifyExecutionDoc('GENERAL_DOCUMENT' as ExecutionDocType)).toBe('OTHER_ID');
  });

  it('unknown type falls through to OTHER_ID', () => {
    expect(classifyExecutionDoc('UNKNOWN_TYPE' as ExecutionDocType)).toBe('OTHER_ID');
  });
});
