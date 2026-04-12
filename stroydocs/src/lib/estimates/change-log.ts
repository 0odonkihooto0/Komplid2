import { db } from '@/lib/db';

interface LogChangeParams {
  versionId: string;
  userId: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  entityType?: string;
  entityId?: string;
}

/** Записывает событие в лог изменений версии сметы */
export async function logEstimateChange(params: LogChangeParams): Promise<void> {
  await db.estimateChangeLog.create({
    data: {
      action: params.action,
      field: params.field ?? null,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      versionId: params.versionId,
      userId: params.userId,
    },
  });
}

/** Возвращает историю изменений версии сметы с пагинацией */
export async function getVersionHistory(
  versionId: string,
  take = 50,
  skip = 0
) {
  const [data, total] = await Promise.all([
    db.estimateChangeLog.findMany({
      where: { versionId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    db.estimateChangeLog.count({ where: { versionId } }),
  ]);

  return { data, total };
}
