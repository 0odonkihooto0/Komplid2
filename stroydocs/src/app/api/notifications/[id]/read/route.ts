import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/** PATCH /api/notifications/[id]/read — отметить одно уведомление как прочитанное.
 *  Обрабатывает как ActivityLog (организация), так и Notification (личное). */
export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Пробуем обновить ActivityLog
    const activityUpdate = await db.activityLog.updateMany({
      where: {
        id: params.id,
        organizationId: session.user.organizationId,
        isRead: false,
      },
      data: { isRead: true },
    });

    if (activityUpdate.count > 0) {
      return successResponse({ updated: true });
    }

    // Если ActivityLog не обновился — пробуем личный Notification
    const notifUpdate = await db.notification.updateMany({
      where: {
        id: params.id,
        userId: session.user.id,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return successResponse({ updated: notifUpdate.count > 0 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return errorResponse('Ошибка обновления уведомления', 500);
  }
}
