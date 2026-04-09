import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/** GET /api/notifications — объединяет ActivityLog (org-wide) и Notification (личные) */
export async function GET() {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const userId = session.user.id;

    const [activityItems, notifItems, unreadActivity, unreadNotifs] = await Promise.all([
      db.activityLog.findMany({
        where: { organizationId: orgId },
        take: 15,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
      db.notification.findMany({
        where: { userId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
      db.activityLog.count({ where: { organizationId: orgId, isRead: false } }),
      db.notification.count({ where: { userId, readAt: null } }),
    ]);

    // Нормализуем Notification к общему формату ActivityLogItem
    const normalizedNotifs = notifItems.map((n) => ({
      id: n.id,
      action: n.type,
      entityType: n.entityType ?? '',
      entityName: n.entityName ?? n.title,
      isRead: n.readAt !== null,
      createdAt: n.createdAt.toISOString(),
      user: n.user,
      source: 'notification' as const,
    }));

    const normalizedActivity = activityItems.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      entityName: a.entityName ?? null,
      isRead: a.isRead,
      createdAt: a.createdAt.toISOString(),
      user: a.user,
      source: 'activity' as const,
    }));

    // Объединяем и сортируем по дате, берём первые 20
    const items = [...normalizedActivity, ...normalizedNotifs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

    const unreadCount = unreadActivity + unreadNotifs;

    return successResponse({ items, unreadCount });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return errorResponse('Ошибка получения уведомлений', 500);
  }
}
