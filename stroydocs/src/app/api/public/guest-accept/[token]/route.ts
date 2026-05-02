import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { successResponse, errorResponse } from '@/utils/api';
import { GuestScope } from '@/types/guest-scope';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Схема тела POST-запроса для принятия приглашения
const acceptInvitationSchema = z.object({
  password: z.string().min(8).max(72).optional(),
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  acceptEula: z.literal(true),
});

// GET — получить информацию о приглашении по токену (публичный роут)
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    const invitation = await db.guestInvitation.findFirst({
      where: { token },
      include: {
        workspace: { select: { name: true } },
        creator: { select: { firstName: true, lastName: true } },
        buildingObject: { select: { name: true } },
      },
    });

    if (!invitation) {
      return errorResponse('Приглашение не найдено', 404);
    }

    // Проверить статус и срок действия
    if (invitation.status === 'REVOKED') {
      return errorResponse('Приглашение отозвано', 410);
    }

    if (invitation.status === 'ACCEPTED') {
      return errorResponse('Приглашение уже принято', 410);
    }

    if (new Date() > invitation.expiresAt) {
      return errorResponse('Срок действия приглашения истёк', 410);
    }

    // Проверить существует ли аккаунт с таким email или телефоном
    let hasAccount = false;
    if (invitation.email) {
      const existing = await db.user.findFirst({
        where: { email: invitation.email },
        select: { id: true },
      });
      hasAccount = !!existing;
    } else if (invitation.phone) {
      const existing = await db.user.findFirst({
        where: { phone: invitation.phone },
        select: { id: true },
      });
      hasAccount = !!existing;
    }

    const inviterName = [
      invitation.creator.firstName,
      invitation.creator.lastName,
    ]
      .filter(Boolean)
      .join(' ');

    return successResponse({
      workspaceName: invitation.workspace.name,
      projectName: invitation.buildingObject?.name ?? null,
      inviterName,
      scope: invitation.scope as unknown as GuestScope,
      expiresAt: invitation.expiresAt,
      hasAccount,
      fullName: invitation.fullName,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения данных гостевого приглашения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// POST — принять гостевое приглашение
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    const body = await req.json();
    const parsed = acceptInvitationSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { password, firstName, lastName } = parsed.data;

    // Найти приглашение со всеми нужными связями
    const invitation = await db.guestInvitation.findFirst({
      where: { token },
      include: {
        workspace: { select: { id: true, organizationId: true, ownerId: true } },
      },
    });

    if (!invitation) {
      return errorResponse('Приглашение не найдено', 404);
    }

    // Повторная проверка актуальности приглашения
    if (invitation.status !== 'PENDING') {
      return errorResponse('Приглашение уже обработано', 410);
    }

    if (new Date() > invitation.expiresAt) {
      return errorResponse('Срок действия приглашения истёк', 410);
    }

    // Определить organizationId воркспейса
    let workspaceOrganizationId = invitation.workspace.organizationId;

    // Если workspace не привязан к организации — берём организацию создателя приглашения
    if (!workspaceOrganizationId) {
      const creator = await db.user.findFirst({
        where: { id: invitation.createdById },
        select: { organizationId: true },
      });
      workspaceOrganizationId = creator?.organizationId ?? null;
    }

    if (!workspaceOrganizationId) {
      return errorResponse('Не удалось определить организацию воркспейса', 500);
    }

    const result = await db.$transaction(async (tx) => {
      // Найти существующего пользователя по email или телефону
      let existingUser = null;

      if (invitation.email) {
        existingUser = await tx.user.findFirst({
          where: { email: invitation.email },
        });
      } else if (invitation.phone) {
        existingUser = await tx.user.findFirst({
          where: { phone: invitation.phone },
        });
      }

      let userId: string;

      if (existingUser) {
        // Пользователь уже есть в системе
        userId = existingUser.id;
      } else {
        // Новый пользователь — пароль обязателен
        if (!password) {
          throw new Error('PASSWORD_REQUIRED');
        }
        if (!firstName || !lastName) {
          throw new Error('NAME_REQUIRED');
        }

        // Создать нового пользователя с хэшем пароля (bcrypt, 12 раундов)
        const passwordHash = await bcrypt.hash(password, 12);

        const newUser = await tx.user.create({
          data: {
            email: invitation.email ?? `guest-${invitation.id}@placeholder.stroydocs`,
            phone: invitation.phone,
            passwordHash,
            firstName,
            lastName,
            organizationId: workspaceOrganizationId as string,
            fullName: invitation.fullName,
          },
        });

        userId = newUser.id;
      }

      // Проверить не является ли пользователь уже членом этого воркспейса
      const existingMembership = await tx.workspaceMember.findFirst({
        where: { workspaceId: invitation.workspaceId, userId },
      });

      if (existingMembership) {
        throw new Error('ALREADY_MEMBER');
      }

      // Добавить пользователя как гостя в workspace
      await tx.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId,
          role: 'GUEST',
          guestScope: invitation.scope as unknown as Prisma.InputJsonValue,
          invitedBy: invitation.createdById,
          invitedAt: invitation.sentAt,
          acceptedAt: new Date(),
        },
      });

      // Пометить приглашение как принятое
      await tx.guestInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });

      return { userId };
    });

    return successResponse({
      userId: result.userId,
      redirectTo: '/guest',
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;

    // Обработать бизнес-ошибки из транзакции
    if (error instanceof Error) {
      if (error.message === 'PASSWORD_REQUIRED') {
        return errorResponse('Для создания аккаунта необходимо указать пароль', 400);
      }
      if (error.message === 'NAME_REQUIRED') {
        return errorResponse('Необходимо указать имя и фамилию', 400);
      }
      if (error.message === 'ALREADY_MEMBER') {
        return errorResponse('Вы уже являетесь участником этого воркспейса', 409);
      }
    }

    logger.error({ err: error }, 'Ошибка принятия гостевого приглашения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
