import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { enqueueNotification } from '@/lib/queue';
import { EXECUTION_DOC_TYPE_LABELS } from '@/utils/constants';

interface TriggerAosrDraftParams {
  workRecordId: string;
  contractId: string;
  createdById: string;
}

/**
 * Автотриггер: при создании записи о работе → черновик АОСР.
 * Вызывается fire-and-forget из POST work-records.
 * Если АОСР для этого workRecordId уже существует — пропускает.
 */
export async function triggerAosrDraftFromOzr({
  workRecordId,
  contractId,
  createdById,
}: TriggerAosrDraftParams): Promise<void> {
  try {
    // 1. Проверка дубликата — не создаём повторно
    const existing = await db.executionDoc.findFirst({
      where: { workRecordId, type: 'AOSR' },
    });
    if (existing) {
      logger.debug({ workRecordId, docId: existing.id }, 'АОСР уже существует, пропускаем');
      return;
    }

    // 2. Получаем данные записи о работе для заголовка
    const workRecord = await db.workRecord.findFirst({
      where: { id: workRecordId },
      include: { workItem: { select: { name: true } } },
    });
    if (!workRecord) {
      logger.warn({ workRecordId }, 'Запись о работе не найдена при создании черновика АОСР');
      return;
    }

    // 3. Генерация номера (паттерн из execution-docs/route.ts)
    const count = await db.executionDoc.count({
      where: { contractId, type: 'AOSR' },
    });
    const number = `AOSR-${String(count + 1).padStart(3, '0')}`;

    // 4. Заголовок: «АОСР — Название работы»
    const workName = workRecord.workItem?.name ?? '';
    const title = `${EXECUTION_DOC_TYPE_LABELS.AOSR}${workName ? ` — ${workName}` : ''}`;

    // 5. Создание черновика АОСР
    const doc = await db.executionDoc.create({
      data: {
        type: 'AOSR',
        number,
        title,
        contractId,
        workRecordId,
        createdById,
      },
    });

    // 6. Получаем email пользователя для уведомления (паттерн из notify.ts)
    const user = await db.user.findUnique({
      where: { id: createdById },
      select: { email: true },
    });

    const notificationTitle = `Создан черновик АОСР: ${title}`;
    const notificationBody = `По записи о работе автоматически создан черновик АОСР «${title}». Проверьте и заполните данные.`;

    // 7. Персональное уведомление в БД
    await db.notification.create({
      data: {
        userId: createdById,
        type: 'aosr_draft_created',
        title: notificationTitle,
        body: notificationBody,
        entityType: 'ExecutionDoc',
        entityId: doc.id,
        entityName: title,
      },
    });

    // 8. Email в очередь (fire-and-forget, enqueueNotification сам ловит ошибки)
    if (user?.email) {
      await enqueueNotification({
        userId: createdById,
        email: user.email,
        type: 'aosr_draft_created',
        title: notificationTitle,
        body: notificationBody,
        entityType: 'ExecutionDoc',
        entityId: doc.id,
        entityName: title,
      });
    }

    logger.info({ docId: doc.id, workRecordId, number }, 'Автоматически создан черновик АОСР');
  } catch (err) {
    // Ошибка триггера не должна влиять на основной поток
    logger.error({ err, workRecordId }, 'Ошибка автосоздания черновика АОСР');
  }
}
