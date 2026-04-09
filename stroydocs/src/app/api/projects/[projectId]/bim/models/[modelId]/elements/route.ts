import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/** GET /api/projects/[projectId]/bim/models/[modelId]/elements
 *  Список элементов ТИМ-модели с поиском и фильтрацией по типу IFC.
 *  Query params: ?search=, ?ifcType=, ?page=, ?limit=
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; modelId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверить принадлежность модели через организацию
    const model = await db.bimModel.findFirst({
      where: {
        id: params.modelId,
        projectId: params.projectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
    });
    if (!model) return errorResponse('Модель не найдена', 404);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? undefined;
    const ifcType = searchParams.get('ifcType') ?? undefined;
    const ifcGuid = searchParams.get('ifcGuid') ?? undefined;
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get('limit') ?? DEFAULT_LIMIT)));
    const skip = (page - 1) * limit;

    const where = {
      modelId: params.modelId,
      ...(ifcGuid ? { ifcGuid } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
      ...(ifcType ? { ifcType } : {}),
    };

    const [elements, total] = await Promise.all([
      db.bimElement.findMany({
        where,
        take: limit,
        skip,
        orderBy: { ifcType: 'asc' },
        select: {
          id: true,
          ifcGuid: true,
          ifcType: true,
          name: true,
          description: true,
          layer: true,
          level: true,
          // properties не включаем в список — только в детальном запросе
        },
      }),
      db.bimElement.count({ where }),
    ]);

    return successResponse(elements, { page, pageSize: limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM elements GET failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
