import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { enqueueBillingEmail } from '@/lib/queue';

export const dynamic = 'force-dynamic';

// Маппинг роль → Pro-план для триала
const ROLE_PRO_PLAN: Record<string, string> = {
  SMETCHIK: 'smetchik_studio_pro',
  PTO: 'id_master_pro',
  FOREMAN: 'foreman_journal_pro',
  SK_INSPECTOR: 'id_master_pro',
  SUPPLIER: 'smetchik_studio_pro',
  PROJECT_MANAGER: 'id_master_pro',
  ACCOUNTANT: 'smetchik_studio_pro',
};

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return errorResponse('Не авторизован', 401);

  const { activeWorkspaceId, professionalRole } = session.user;
  if (!activeWorkspaceId) return errorResponse('Workspace не найден', 404);

  const workspace = await db.workspace.findUnique({
    where: { id: activeWorkspaceId },
    include: { activeSubscription: true },
  });
  if (!workspace) return errorResponse('Workspace не найден', 404);
  if (workspace.type !== 'PERSONAL') {
    return errorResponse('Триал доступен только для личного workspace', 400);
  }
  if (workspace.activeSubscription) {
    return errorResponse('У вас уже есть активная подписка', 409);
  }

  const planCode = ROLE_PRO_PLAN[professionalRole ?? ''] ?? 'smetchik_studio_pro';
  const plan = await db.subscriptionPlan.findUnique({ where: { code: planCode } });
  if (!plan) return errorResponse('Тарифный план не найден', 404);

  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  try {
    const sub = await db.$transaction(async (tx) => {
      const subscription = await tx.subscription.create({
        data: {
          workspaceId: activeWorkspaceId,
          planId: plan.id,
          status: 'TRIAL',
          billingPeriod: 'MONTHLY',
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          trialEnd,
        },
      });

      await tx.workspace.update({
        where: { id: activeWorkspaceId },
        data: { activeSubscriptionId: subscription.id },
      });

      return subscription;
    });

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, firstName: true, lastName: true },
    });
    if (user) {
      const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email.split('@')[0];
      await enqueueBillingEmail({
        userId: session.user.id,
        email: user.email,
        type: 'TRIAL_STARTED',
        subject: 'Пробный период StroyDocs начался',
        templateName: 'trial-started',
        data: {
          userName,
          planName: plan.name,
          appUrl: process.env.APP_URL ?? 'https://app.stroydocs.ru',
          trialDays: 14,
          trialEndDate: trialEnd.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
        },
      });
    }

    return successResponse({
      subscriptionId: sub.id,
      trialEnd: sub.trialEnd,
      planCode,
    });
  } catch (error) {
    logger.error({ err: error }, 'Ошибка старта триала');
    return errorResponse('Не удалось активировать триал', 500);
  }
}
