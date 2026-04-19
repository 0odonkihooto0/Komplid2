import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; contractId: string; docId: string } };

/**
 * POST — подписать документ (заглушка до интеграции КриптоПро CSP)
 *
 * Проверяет, что текущий пользователь входит в маршрут подписания,
 * затем возвращает 501 с инструкцией по настройке КриптоПро.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const route = await db.signingRoute.findUnique({
      where: { executionDocId: params.docId },
      include: { steps: true },
    });

    if (!route || route.status !== 'PENDING') {
      return errorResponse('Активный маршрут подписания не найден', 400);
    }

    const step = route.steps.find(
      (s) => s.userId === session.user.id && s.status === 'WAITING'
    );

    if (!step) {
      return errorResponse('Вы не входите в маршрут подписания или уже подписали документ', 400);
    }

    // Заглушка: реальная подпись требует КриптоПро CSP
    return errorResponse(
      'Подписание ЭЦП требует КриптоПро CSP. Функция будет доступна после настройки провайдера в настройках организации.',
      501
    );
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка подписания документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
