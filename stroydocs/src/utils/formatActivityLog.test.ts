import { describe, it, expect } from 'vitest';
import { formatActivityLog } from './formatActivityLog';

describe('formatActivityLog', () => {
  it('форматирует известное действие (signed_doc → подписал документ, tone=ok)', () => {
    const result = formatActivityLog({
      action: 'signed_doc',
      entityType: 'ExecutionDoc',
      entityId: 'abc-123',
      entityName: 'АОСР № 42',
    });
    expect(result.verb).toBe('подписал(а) документ');
    expect(result.target).toBe('АОСР № 42');
    expect(result.tone).toBe('ok');
  });

  it('форматирует неизвестное действие с neutral-тоном и ключом-строкой', () => {
    const result = formatActivityLog({
      action: 'some_exotic_action',
      entityType: 'Contract',
      entityId: 'xyz-999',
      entityName: 'ДГ-12/2025',
    });
    expect(result.verb).toBe('some_exotic_action');
    expect(result.tone).toBe('neutral');
    expect(result.target).toBe('ДГ-12/2025');
  });

  it('падает обратно на entityId когда entityName отсутствует', () => {
    const result = formatActivityLog({
      action: 'created_doc',
      entityType: 'ExecutionDoc',
      entityId: 'fallback-id',
      entityName: null,
    });
    expect(result.target).toBe('fallback-id');
    expect(result.verb).toBe('создал(а) документ');
    expect(result.tone).toBe('info');
  });
});
