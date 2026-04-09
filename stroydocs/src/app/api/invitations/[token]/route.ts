import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const invitation = await db.invitation.findUnique({
      where: { token: params.token },
      include: { organization: { select: { name: true } } },
    });

    if (!invitation) {
      return errorResponse('Приглашение не найдено', 404);
    }

    if (invitation.status !== 'PENDING') {
      return errorResponse('Приглашение уже использовано или истекло', 400);
    }

    if (new Date() > invitation.expiresAt) {
      return errorResponse('Срок действия приглашения истёк', 400);
    }

    return successResponse({
      email: invitation.email,
      organizationName: invitation.organization.name,
      role: invitation.role,
    });
  } catch (error) {
    logger.error({ err: error }, 'Ошибка получения приглашения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
