/*
 * Форматтер для записей ActivityLog.
 *
 * Схема ActivityLog (prisma/schema.prisma:1756) — плоская: поле `action` это
 * строковый ключ ("created_doc", "signed_doc", ...), нет JSON-diff. Форматтер
 * переводит эти ключи в человекочитаемый русский текст + подбирает семантический
 * тон чипа (ok / err / info / neutral) для UI.
 */

export type ActivityTone = 'ok' | 'err' | 'info' | 'warn' | 'accent' | 'neutral';

export interface FormattedActivity {
  verb: string;
  target: string | null;
  tone: ActivityTone;
}

interface ActivityLogInput {
  action: string;
  entityType: string;
  entityId: string;
  entityName: string | null;
}

const VERB_MAP: Record<string, { verb: string; tone: ActivityTone }> = {
  created_doc: { verb: 'создал(а) документ', tone: 'info' },
  signed_doc: { verb: 'подписал(а) документ', tone: 'ok' },
  rejected_doc: { verb: 'отклонил(а) документ', tone: 'err' },
  approved_doc: { verb: 'согласовал(а) документ', tone: 'ok' },
  created_contract: { verb: 'создал(а) договор', tone: 'info' },
  updated_contract: { verb: 'обновил(а) договор', tone: 'info' },
  created_work_record: { verb: 'добавил(а) запись ОЖР', tone: 'info' },
  updated_object: { verb: 'обновил(а) паспорт объекта', tone: 'info' },
  created_ks2: { verb: 'создал(а) акт КС-2', tone: 'info' },
  signed_ks2: { verb: 'подписал(а) акт КС-2', tone: 'ok' },
};

export function formatActivityLog(entry: ActivityLogInput): FormattedActivity {
  const mapped = VERB_MAP[entry.action];
  const target = entry.entityName && entry.entityName.length > 0 ? entry.entityName : entry.entityId;
  if (mapped) {
    return { verb: mapped.verb, target, tone: mapped.tone };
  }
  // Неизвестное действие — показываем ключ как есть, нейтральный тон
  return { verb: entry.action, target, tone: 'neutral' };
}
