import { db } from '@/lib/db';
import { ReferenceAuditAction, Prisma } from '@prisma/client';

interface AuditInput {
  entityType: string;
  entityId: string;
  action: ReferenceAuditAction;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  userId: string;
  organizationId?: string | null;
}

/** Возвращает список ключей, значение которых изменилось между двумя снапшотами */
export function diffObjects(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
): string[] {
  if (!before && !after) return [];
  if (!before) return Object.keys(after ?? {});
  if (!after) return Object.keys(before);
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return Array.from(keys).filter(
    (k) => JSON.stringify(before[k]) !== JSON.stringify(after[k])
  );
}

/** Записывает событие изменения справочника в таблицу reference_audits */
export async function writeAudit({
  entityType,
  entityId,
  action,
  oldValues,
  newValues,
  userId,
  organizationId,
}: AuditInput) {
  const changedFields =
    action === ReferenceAuditAction.UPDATE
      ? diffObjects(oldValues, newValues)
      : [];

  return db.referenceAudit.create({
    data: {
      entityType,
      entityId,
      action,
      oldValues:
        oldValues != null
          ? (oldValues as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      newValues:
        newValues != null
          ? (newValues as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      changedFields,
      userId,
      organizationId: organizationId ?? null,
    },
  });
}
