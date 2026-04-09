import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { inviteEmployeeSchema } from '@/lib/validations/organization';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSessionOrThrow();

    const invitations = await db.invitation.findMany({
      where: { organizationId: session.user.organizationId },
      include: { invitedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(invitations);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения приглашений');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();

    // Только админ и менеджер могут приглашать
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return errorResponse('Недостаточно прав', 403);
    }

    const body = await req.json();
    const parsed = inviteEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Проверка что email не занят
    const existingUser = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (existingUser) {
      return errorResponse('Пользователь с таким email уже существует', 409);
    }

    // Проверка дублирования приглашения
    const existingInvite = await db.invitation.findFirst({
      where: {
        email: parsed.data.email,
        organizationId: session.user.organizationId,
        status: 'PENDING',
      },
    });
    if (existingInvite) {
      return errorResponse('Приглашение для этого email уже отправлено', 409);
    }

    const invitation = await db.invitation.create({
      data: {
        email: parsed.data.email,
        role: parsed.data.role,
        token: randomUUID(),
        organizationId: session.user.organizationId,
        invitedById: session.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
      },
    });

    // Ссылка приглашения (в MVP — просто копируется)
    const inviteUrl = `${process.env.APP_URL || 'http://localhost:3000'}/invite?token=${invitation.token}`;

    return successResponse({ invitation, inviteUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания приглашения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
