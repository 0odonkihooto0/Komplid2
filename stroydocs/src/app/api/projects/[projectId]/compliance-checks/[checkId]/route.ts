import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; checkId: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const check = await db.aiComplianceCheck.findFirst({
      where: { id: params.checkId, projectId: params.projectId },
      include: {
        issues: {
          orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }],
        },
        initiator: { select: { firstName: true, lastName: true } },
      },
    });
    if (!check) return errorResponse('Проверка не найдена', 404);

    return successResponse(check);
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') return err as unknown as never;
    logger.error({ err }, '[compliance] Ошибка получения результатов проверки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
