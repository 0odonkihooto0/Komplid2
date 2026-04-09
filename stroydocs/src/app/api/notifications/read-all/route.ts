import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/** PATCH /api/notifications/read-all — отметить все уведомления как прочитанные */
export async function PATCH() {
  try {
    const session = await getSessionOrThrow();

    // Обновляем ActivityLog организации и личные Notification параллельно
    await Promise.all([
      db.activityLog.updateMany({
        where: { organizationId: session.user.organizationId, isRead: false },
        data: { isRead: true },
      }),
      db.notification.updateMany({
        where: { userId: session.user.id, readAt: null },
        data: { readAt: new Date() },
      }),
    ]);

    return successResponse({ updated: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return errorResponse('Ошибка обновления уведомлений', 500);
  }
}
