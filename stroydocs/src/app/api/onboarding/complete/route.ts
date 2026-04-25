import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/utils/api';
import { clearSignupContext } from '@/lib/tracking/signupContext';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return errorResponse('Не авторизован', 401);

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        referredByCode: true,
        activeWorkspaceId: true,
        onboardingStep: true,
      },
    });

    await db.user.update({
      where: { id: session.user.id },
      data: {
        onboardingCompleted: true,
        onboardingStep: 'COMPLETED',
      },
    });

    // Засчитать реферал если есть (signupAt → firstPaidAt логика в MODULE16)
    // Обновляем referredUserId на текущего пользователя, если он пришёл по коду
    if (user?.referredByCode) {
      await db.referral.updateMany({
        where: {
          referredUserId: session.user.id,
          signupAt: { not: null },
          firstPaidAt: null,
        },
        data: { signupAt: new Date() },
      }).catch((err) => {
        // Некритично — MODULE16 может быть ещё не активирован
        logger.warn({ err }, 'Не удалось обновить реферал при завершении онбординга');
      });
    }

    // Очищаем signup_context cookie
    const cookieStore = await cookies();
    clearSignupContext(cookieStore);

    return successResponse({ onboardingCompleted: true });
  } catch (error) {
    logger.error({ err: error }, 'Ошибка завершения онбординга');
    return errorResponse('Не удалось завершить онбординг', 500);
  }
}
