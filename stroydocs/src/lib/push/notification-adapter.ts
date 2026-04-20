import type { Notification } from '@prisma/client';
import { sendPushToUser, type PushPayload } from './send-push';

// Минимальный набор полей для построения push payload
export interface NotificationLike {
  id?: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  entityId?: string | null;
  entityName?: string | null;
}

interface PushConfig {
  title: (n: NotificationLike) => string;
  body: (n: NotificationLike) => string;
  url: (n: NotificationLike) => string;
  urgent?: boolean;
}

const PUSH_CONFIGS: Partial<Record<string, PushConfig>> = {
  approval_required: {
    title: (n) => `Требуется согласование: ${n.entityName ?? ''}`,
    body: (n) => n.body,
    url: () => '/inbox',
    urgent: true,
  },
  approval_approved: {
    title: (n) => `Согласовано: ${n.entityName ?? ''}`,
    body: (n) => n.body,
    url: (n) => (n.entityId ? `/objects/${n.entityId}` : '/inbox'),
  },
  approval_rejected: {
    title: (n) => `Отклонено: ${n.entityName ?? ''}`,
    body: (n) => n.body,
    url: (n) => (n.entityId ? `/objects/${n.entityId}` : '/inbox'),
    urgent: true,
  },
  prescription_deadline: {
    title: (n) => n.title,
    body: (n) => n.body,
    url: (n) => (n.entityId ? `/objects/${n.entityId}/sk` : '/inbox'),
    urgent: true,
  },
  inspection_reminder: {
    title: (n) => n.title,
    body: (n) => n.body,
    url: (n) => (n.entityId ? `/objects/${n.entityId}/journals` : '/inbox'),
  },
  remark_assigned: {
    title: (n) => `Новое замечание: ${n.entityName ?? ''}`,
    body: (n) => n.body,
    url: (n) => (n.entityId ? `/objects/${n.entityId}` : '/inbox'),
    urgent: true,
  },
  defect_overdue: {
    title: (n) => n.title,
    body: (n) => n.body,
    url: (n) => (n.entityId ? `/objects/${n.entityId}/sk` : '/inbox'),
    urgent: true,
  },
  doc_signed: {
    title: (n) => `Подписан: ${n.entityName ?? ''}`,
    body: (n) => n.body,
    url: (n) => (n.entityId ? `/objects/${n.entityId}` : '/inbox'),
  },
  doc_rejected: {
    title: (n) => `Отклонён: ${n.entityName ?? ''}`,
    body: (n) => n.body,
    url: (n) => (n.entityId ? `/objects/${n.entityId}` : '/inbox'),
    urgent: true,
  },
};

async function sendPush(n: NotificationLike): Promise<void> {
  const config = PUSH_CONFIGS[n.type];
  if (!config) return;

  const payload: PushPayload = {
    title: config.title(n),
    body: config.body(n),
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    url: config.url(n),
    tag: `${n.type}:${n.entityId ?? n.id ?? n.userId}`,
    data: n.id ? { notificationId: n.id } : undefined,
  };

  await sendPushToUser(n.userId, payload);
}

// Для использования с полной Prisma-моделью Notification
export async function sendPushForNotification(notification: Notification): Promise<void> {
  await sendPush(notification);
}

// Для использования из BullMQ воркера (NotificationJob не имеет поля id)
export async function sendPushForNotificationJob(job: NotificationLike): Promise<void> {
  await sendPush(job);
}
