import { db } from '@/lib/db';
import { enqueueNotification } from '@/lib/queue';

interface NotifyApprovalParams {
  docId: string;
  docName: string;
  // Кто инициировал (принял решение)
  actorName: string;
  // Тип события
  event: 'approved' | 'rejected' | 'approval_required';
  // ID пользователя для уведомления (следующий согласующий или автор документа)
  targetUserId: string;
  // Тип сущности для уведомления (по умолчанию — ExecutionDoc)
  entityType?: string;
}

// Создаёт персональное Notification в БД и ставит email в BullMQ-очередь
export async function notifyApprovalEvent({
  docId,
  docName,
  actorName,
  event,
  targetUserId,
  entityType = 'ExecutionDoc',
}: NotifyApprovalParams): Promise<void> {
  const type =
    event === 'approved'
      ? 'doc_signed'
      : event === 'rejected'
        ? 'doc_rejected'
        : 'approval_required';

  const titleMap: Record<string, string> = {
    doc_signed: `Документ согласован: ${docName}`,
    doc_rejected: `Документ отклонён: ${docName}`,
    approval_required: `Требуется согласование: ${docName}`,
  };

  const bodyMap: Record<string, string> = {
    doc_signed: `${actorName} согласовал документ «${docName}». Документ передан на следующий этап.`,
    doc_rejected: `${actorName} отклонил документ «${docName}». Требуется исправление.`,
    approval_required: `${actorName} направил документ «${docName}» на ваше согласование. Пожалуйста, рассмотрите в ближайшее время.`,
  };

  const title = titleMap[type];
  const body = bodyMap[type];

  // Получаем email пользователя для письма
  const targetUser = await db.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true },
  });
  if (!targetUser) return;

  // Сохраняем в БД (персональное уведомление)
  await db.notification.create({
    data: {
      userId: targetUserId,
      type,
      title,
      body,
      entityType,
      entityId: docId,
      entityName: docName,
    },
  });

  // Ставим email в очередь (fire-and-forget)
  await enqueueNotification({
    userId: targetUserId,
    email: targetUser.email,
    type,
    title,
    body,
    entityType,
    entityId: docId,
    entityName: docName,
  });
}
