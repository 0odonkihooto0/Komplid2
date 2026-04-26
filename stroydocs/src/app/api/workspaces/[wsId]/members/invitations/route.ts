import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { requirePermission } from '@/lib/permissions/check';
import { ACTIONS } from '@/lib/permissions/actions';
import { requireLimit } from '@/lib/subscriptions/require-limit';
import { LimitExceededError } from '@/lib/subscriptions/errors';
import { inviteMemberSchema, inviteGuestSchema } from '@/lib/validations/workspace-member';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/** Список активных приглашений в workspace */
export async function GET(
  req: NextRequest,
  { params }: { params: { wsId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    await requirePermission(session.user.id, params.wsId, ACTIONS.WORKSPACE_MANAGE_MEMBERS);

    const invitations = await db.workspaceInvitation.findMany({
      where: { workspaceId: params.wsId, status: 'PENDING' },
      include: {
        invitedBy: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(invitations);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения приглашений workspace');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** Создать приглашение в workspace */
export async function POST(
  req: NextRequest,
  { params }: { params: { wsId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    await requirePermission(session.user.id, params.wsId, ACTIONS.WORKSPACE_MANAGE_MEMBERS);

    const body = await req.json();

    // Определяем схему по типу роли
    const isGuest = body.role === 'GUEST' || body.role === 'CUSTOMER';
    const schema = isGuest ? inviteGuestSchema : inviteMemberSchema;
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { email, role } = parsed.data;

    // Проверка квоты по тарифу
    const activeCount = await db.workspaceMember.count({
      where: { workspaceId: params.wsId, status: 'ACTIVE' },
    });
    const pendingCount = await db.workspaceInvitation.count({
      where: { workspaceId: params.wsId, status: 'PENDING' },
    });
    const limitKey = isGuest ? 'maxGuests' : 'maxUsers';

    try {
      await requireLimit(params.wsId, limitKey, activeCount + pendingCount);
    } catch (err) {
      if (err instanceof LimitExceededError) {
        return errorResponse('Превышен лимит участников по текущему тарифу', 403);
      }
      throw err;
    }

    // Проверка дубля: уже является членом
    const existingMember = await db.workspaceMember.findFirst({
      where: {
        workspaceId: params.wsId,
        status: 'ACTIVE',
        user: { email },
      },
    });
    if (existingMember) {
      return errorResponse('Пользователь уже является членом команды', 409);
    }

    // Проверка дубля: уже есть активное приглашение
    const existingInvite = await db.workspaceInvitation.findFirst({
      where: { workspaceId: params.wsId, email, status: 'PENDING' },
    });
    if (existingInvite) {
      return errorResponse('Приглашение для этого email уже отправлено', 409);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const data = parsed.data as {
      email: string;
      role: string;
      specialization?: string;
      title?: string;
      guestScope?: { permissions?: { canViewCosts?: boolean; canSignActs?: boolean } };
    };

    const invitation = await db.workspaceInvitation.create({
      data: {
        email,
        role: role as never,
        workspaceId: params.wsId,
        invitedById: session.user.id,
        specialization: data.specialization ?? null,
        title: data.title ?? null,
        expiresAt,
      },
    });

    const inviteUrl = `${process.env.APP_URL ?? ''}/workspace/join?token=${invitation.token}`;

    logger.info(
      { invitationId: invitation.id, wsId: params.wsId, email },
      'Приглашение в workspace создано'
    );

    return successResponse({ invitation, inviteUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания приглашения workspace');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
