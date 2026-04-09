import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: { objectId: string; corrId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const correspondence = await db.correspondence.findFirst({
      where: { id: params.corrId, projectId: params.objectId },
    });
    if (!correspondence) return errorResponse('Письмо не найдено', 404);

    if (correspondence.status !== 'DRAFT') {
      return errorResponse('Отправить можно только черновик', 409);
    }

    const updated = await db.correspondence.update({
      where: { id: params.corrId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    // Уведомляем пользователей организации-получателя
    const receiverUsers = await db.user.findMany({
      where: { organizationId: correspondence.receiverOrgId, isActive: true },
      select: { id: true },
    });

    if (receiverUsers.length > 0) {
      await db.notification.createMany({
        data: receiverUsers.map((u: { id: string }) => ({
          userId: u.id,
          type: 'CORRESPONDENCE_RECEIVED',
          title: 'Новое входящее письмо',
          body: `Письмо «${correspondence.subject}» (${correspondence.number})`,
          entityType: 'Correspondence',
          entityId: correspondence.id,
        })),
        skipDuplicates: true,
      });
    }

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка отправки письма');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
