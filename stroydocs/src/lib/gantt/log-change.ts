import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

interface LogGanttChangeParams {
  versionId: string;
  userId: string;
  action: string; // 'CREATE' | 'UPDATE' | 'DELETE'
  taskId?: string;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
}

/**
 * Записывает событие изменения в журнал ГПР.
 * Никогда не выбрасывает исключение — ошибки записи логируются и проглатываются.
 * Можно вызывать fire-and-forget через void.
 */
export async function logGanttChange(params: LogGanttChangeParams): Promise<void> {
  try {
    await db.ganttChangeLog.create({
      data: {
        versionId: params.versionId,
        userId: params.userId,
        action: params.action,
        taskId: params.taskId ?? null,
        fieldName: params.fieldName ?? null,
        oldValue: params.oldValue ?? null,
        newValue: params.newValue ?? null,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Ошибка записи в журнал изменений ГПР');
  }
}
