import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { guestScopeSchema } from '@/types/guest-scope';
import { sendNotificationEmail } from '@/lib/email';
import { sendSms } from '@/lib/sms';

export const dynamic = 'force-dynamic';

// Роли, которым разрешено управлять гостевыми приглашениями
const ALLOWED_ROLES = ['OWNER', 'ADMIN', 'MANAGER'] as const;
// Роли с правом создавать приглашения (более строгое условие)
const CREATE_ROLES = ['OWNER', 'ADMIN', 'MANAGER'] as const;

// Схема валидации тела POST-запроса
const createGuestInvitationSchema = z
  .object({
    fullName: z.string().min(2).max(100),
    email: z.string().email().optional(),
    phone: z.string().regex(/^\+?\d{10,15}$/).optional(),
    projectId: z.string().uuid().optional(),
    contractId: z.string().uuid().optional(),
    scope: guestScopeSchema,
    expiresInDays: z.number().int().min(1).max(365).default(30),
  })
  .refine((d) => d.email || d.phone, {
    message: 'Необходимо указать email или телефон',
  });

// GET — список гостевых приглашений воркспейса
export async function GET(
  _req: NextRequest,
  { params }: { params: { wsId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const { wsId } = params;

    // Проверить что пользователь является членом workspace с нужной ролью
    const membership = await db.workspaceMember.findFirst({
      where: {
        workspaceId: wsId,
        userId: session.user.id,
        role: { in: [...ALLOWED_ROLES] },
      },
    });

    if (!membership) {
      return errorResponse('Доступ запрещён', 403);
    }

    // Дополнительная проверка принадлежности workspace организации пользователя
    const workspace = await db.workspace.findFirst({
      where: { id: wsId, organizationId: session.user.organizationId },
    });

    if (!workspace) {
      return errorResponse('Воркспейс не найден', 404);
    }

    const invitations = await db.guestInvitation.findMany({
      where: { workspaceId: wsId },
      include: {
        creator: { select: { firstName: true, lastName: true } },
        buildingObject: { select: { name: true } },
        contract: { select: { number: true } },
      },
      orderBy: { sentAt: 'desc' },
    });

    return successResponse(invitations);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения гостевых приглашений');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// POST — создать гостевое приглашение
export async function POST(
  req: NextRequest,
  { params }: { params: { wsId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const { wsId } = params;

    // Проверить что пользователь член workspace с правом создавать приглашения
    const membership = await db.workspaceMember.findFirst({
      where: {
        workspaceId: wsId,
        userId: session.user.id,
        role: { in: [...CREATE_ROLES] },
      },
    });

    if (!membership) {
      return errorResponse('Недостаточно прав для создания приглашений', 403);
    }

    // Проверить принадлежность workspace организации пользователя (multi-tenancy)
    const workspace = await db.workspace.findFirst({
      where: { id: wsId, organizationId: session.user.organizationId },
    });

    if (!workspace) {
      return errorResponse('Воркспейс не найден', 404);
    }

    const body = await req.json();
    const parsed = createGuestInvitationSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const {
      fullName,
      email,
      phone,
      projectId,
      contractId,
      scope,
      expiresInDays,
    } = parsed.data;

    // Вычислить дату истечения приглашения
    const expiresAt = new Date(
      Date.now() + expiresInDays * 24 * 60 * 60 * 1000
    );
    const token = randomUUID();
    const appUrl = process.env.APP_URL ?? 'https://app.stroydocs.ru';

    // Создать запись приглашения
    const invitation = await db.guestInvitation.create({
      data: {
        workspaceId: wsId,
        fullName,
        email,
        phone,
        projectId,
        contractId,
        scope: scope as unknown as Prisma.InputJsonValue,
        token,
        expiresAt,
        createdById: session.user.id,
      },
      include: {
        creator: { select: { firstName: true, lastName: true } },
      },
    });

    const acceptUrl = `${appUrl}/accept-guest/${token}`;

    // Отправить email если указан
    if (email) {
      try {
        await sendNotificationEmail({
          userId: session.user.id,
          email,
          type: 'guest_invitation',
          title: 'Вас пригласили в проект',
          body: `Здравствуйте, ${fullName}!<br><br>Вас пригласили присоединиться к проекту в StroyDocs.<br><br><a href="${acceptUrl}" style="color:#2563EB;">Принять приглашение →</a><br><br>Ссылка действительна ${expiresInDays} дней.`,
        });
      } catch (emailErr) {
        // Не роняем создание приглашения из-за ошибки рассылки
        logger.error({ err: emailErr, email }, 'Ошибка отправки email гостевого приглашения');
      }
    }

    // Отправить SMS если указан телефон
    if (phone) {
      const smsText = `StroyDocs: вас пригласили в проект. Принять приглашение: ${acceptUrl}`;
      // sendSms не бросает ошибок при отсутствии SMS_API_KEY
      await sendSms(phone, smsText);
    }

    return successResponse(invitation);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания гостевого приглашения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
