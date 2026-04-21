import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/utils/api';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const acceptSchema = z.object({
  token: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(6).max(72, 'Пароль не может быть длиннее 72 символов'),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`invite-accept:${ip}`, 5, 60 * 1000)) {
    return errorResponse('Слишком много запросов, попробуйте позже', 429);
  }

  try {
    const body = await req.json();
    const parsed = acceptSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { token, firstName, lastName, password } = parsed.data;

    const invitation = await db.invitation.findUnique({
      where: { token },
    });

    if (!invitation || invitation.status !== 'PENDING') {
      return errorResponse('Приглашение недействительно', 400);
    }

    if (new Date() > invitation.expiresAt) {
      return errorResponse('Срок действия приглашения истёк', 400);
    }

    // Проверка что email не занят
    const existingUser = await db.user.findUnique({ where: { email: invitation.email } });
    if (existingUser) {
      return errorResponse('Пользователь с таким email уже существует', 409);
    }

    const passwordHash = await hash(password, 12);

    // Создание пользователя и обновление приглашения в транзакции
    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          firstName,
          lastName,
          role: invitation.role,
          organizationId: invitation.organizationId,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });

      // Добавить пользователя в воркспейс организации
      const orgWorkspace = await tx.workspace.findFirst({
        where: { organizationId: invitation.organizationId },
      });
      if (orgWorkspace) {
        await tx.workspaceMember.create({
          data: { workspaceId: orgWorkspace.id, userId: newUser.id, role: 'MEMBER' },
        });
        await tx.user.update({
          where: { id: newUser.id },
          data: { activeWorkspaceId: orgWorkspace.id },
        });
      }

      return newUser;
    });

    return successResponse({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });
  } catch (error) {
    logger.error({ err: error }, 'Ошибка принятия приглашения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
