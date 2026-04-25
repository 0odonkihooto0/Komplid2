import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/utils/api';
import { getSignupContext } from '@/lib/tracking/signupContext';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Маппинг intent → планкод для триала
const INTENT_PLAN_MAP: Record<string, string> = {
  ESTIMATOR: 'smetchik_studio_pro',
  PTO_ENGINEER: 'id_master_pro',
  CONTRACTOR_INDIVIDUAL: 'foreman_journal_pro',
  CONTRACTOR_GENERAL: 'id_master_pro',
  CONTRACTOR_SUB: 'foreman_journal_pro',
  CONSTRUCTION_SUPERVISOR: 'id_master_pro',
  CUSTOMER_PRIVATE: 'smetchik_studio_pro',
};

const schema = z.object({
  planCode: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return errorResponse('Не авторизован', 401);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Неверные данные', 400, parsed.error.issues);
  }

  const cookieStore = await cookies();
  const signupContext = getSignupContext(cookieStore);

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { intent: true, referredByCode: true, activeWorkspaceId: true },
  });

  const workspaceId = user?.activeWorkspaceId ?? session.user.activeWorkspaceId;
  if (!workspaceId) return errorResponse('Workspace не найден. Сначала создайте пространство.', 400);

  const workspace = await db.workspace.findFirst({
    where: { id: workspaceId, ownerId: session.user.id },
    include: { activeSubscription: true },
  });
  if (!workspace) return errorResponse('Workspace не найден', 404);
  if (workspace.activeSubscription?.status === 'ACTIVE') {
    return errorResponse('У вас уже есть активная подписка', 409);
  }

  // Определяем план: явный параметр → signupContext → intent → дефолт
  const planCode =
    parsed.data.planCode ??
    signupContext.plan ??
    INTENT_PLAN_MAP[user?.intent ?? ''] ??
    'smetchik_studio_pro';

  const plan = await db.subscriptionPlan.findUnique({ where: { code: planCode } });
  if (!plan) return errorResponse('Тарифный план не найден', 404);

  const now = new Date();
  // Базовый триал 7 дней; реферальный бонус +30 дней
  const trialDays = user?.referredByCode ? 37 : 7;
  const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

  try {
    const sub = await db.$transaction(async (tx) => {
      // Удалить существующий истёкший триал если есть
      if (workspace.activeSubscription) {
        await tx.workspace.update({
          where: { id: workspaceId },
          data: { activeSubscriptionId: null },
        });
      }

      const subscription = await tx.subscription.create({
        data: {
          workspaceId,
          planId: plan.id,
          status: 'TRIAL',
          billingPeriod: 'MONTHLY',
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          trialEnd,
        },
      });

      await tx.workspace.update({
        where: { id: workspaceId },
        data: { activeSubscriptionId: subscription.id },
      });

      await tx.user.update({
        where: { id: session.user.id },
        data: { onboardingStep: 'PLAN_CHOSEN' },
      });

      return subscription;
    });

    return successResponse({
      subscriptionId: sub.id,
      trialEnd: sub.trialEnd,
      trialDays,
      planCode,
    });
  } catch (error) {
    logger.error({ err: error }, 'Ошибка старта триала');
    return errorResponse('Не удалось активировать триал', 500);
  }
}

// Пропустить тариф — остаться на Free
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return errorResponse('Не авторизован', 401);

  await db.user.update({
    where: { id: session.user.id },
    data: { onboardingStep: 'PLAN_CHOSEN' },
  });

  return successResponse({ skipped: true });
}
