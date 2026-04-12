import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { compareVersions } from '@/lib/estimates/compare-versions';
import { compareModeSchema } from '@/lib/validations/estimate';

export const dynamic = 'force-dynamic';

/**
 * GET /estimate-versions/compare?v1=uuid1&v2=uuid2
 * Возвращает diff двух версий: added / removed / changed / unchanged + summary
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const { searchParams } = new URL(req.url);
    const v1 = searchParams.get('v1');
    const v2 = searchParams.get('v2');
    const mode = searchParams.get('mode') ?? 'default';

    const parsedMode = compareModeSchema.safeParse(mode);
    if (!parsedMode.success) return errorResponse('Недопустимый режим сравнения', 400);

    if (!v1 || !v2) {
      return errorResponse('Необходимо передать параметры v1 и v2', 400);
    }

    // Проверяем что обе версии принадлежат этому договору
    const [version1, version2] = await Promise.all([
      db.estimateVersion.findFirst({ where: { id: v1, contractId: params.contractId } }),
      db.estimateVersion.findFirst({ where: { id: v2, contractId: params.contractId } }),
    ]);

    if (!version1) return errorResponse('Версия v1 не найдена в этом договоре', 404);
    if (!version2) return errorResponse('Версия v2 не найдена в этом договоре', 404);

    const result = await compareVersions(v1, v2, parsedMode.data);
    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка сравнения версий смет');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
