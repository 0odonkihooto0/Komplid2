import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Маппинг workspace ролей из UI → UserRole для Invitation
const WS_ROLE_TO_USER_ROLE: Record<string, UserRole> = {
  MANAGER: 'MANAGER',
  ENGINEER: 'MANAGER',
  FOREMAN: 'MANAGER',
  WORKER: 'WORKER',
};

const schema = z.object({
  invites: z
    .array(
      z.object({
        email: z.string().email('Неверный email'),
        role: z.enum(['MANAGER', 'ENGINEER', 'FOREMAN', 'WORKER']),
      })
    )
    .min(1)
    .max(20),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return errorResponse('Не авторизован', 401);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Неверные данные', 400, parsed.error.issues);
  }

  const { organizationId } = session.user;
  if (!organizationId) return errorResponse('Организация не найдена', 400);

  const { invites } = parsed.data;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    // Фильтруем уже приглашённых
    const existingEmails = await db.invitation.findMany({
      where: {
        organizationId,
        email: { in: invites.map((i) => i.email) },
        status: 'PENDING',
      },
      select: { email: true },
    });
    const existingSet = new Set(existingEmails.map((e) => e.email));
    const newInvites = invites.filter((i) => !existingSet.has(i.email));

    if (newInvites.length > 0) {
      await db.invitation.createMany({
        data: newInvites.map((i) => ({
          email: i.email,
          organizationId,
          role: WS_ROLE_TO_USER_ROLE[i.role] ?? 'WORKER',
          expiresAt,
          invitedById: session.user.id,
          token: crypto.randomUUID(),
        })),
      });
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { onboardingStep: 'TEAM_INVITED' },
    });

    return successResponse({ invitedCount: newInvites.length, skippedCount: existingSet.size });
  } catch (error) {
    logger.error({ err: error }, 'Ошибка создания приглашений при онбординге');
    return errorResponse('Не удалось отправить приглашения', 500);
  }
}

// Пропустить шаг
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return errorResponse('Не авторизован', 401);

  await db.user.update({
    where: { id: session.user.id },
    data: { onboardingStep: 'TEAM_INVITED' },
  });

  return successResponse({ skipped: true });
}
