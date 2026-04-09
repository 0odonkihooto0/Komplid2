import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/** GET /api/projects/[projectId]/bim/issues
 *  Реестр замечаний к ЦИМ — дефекты строительного контроля, привязанные к элементам ТИМ.
 *  Получаем через BimElementLink WHERE entityType='Defect', затем тянем сами Defect.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get('limit') ?? DEFAULT_LIMIT)));
    const skip = (page - 1) * limit;

    // Получаем ссылки на Defect-ы через BimElementLink
    const [links, total] = await Promise.all([
      db.bimElementLink.findMany({
        where: {
          entityType: 'Defect',
          model: { projectId: params.projectId },
        },
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          element: { select: { id: true, ifcGuid: true, ifcType: true, name: true } },
          model: { select: { id: true, name: true } },
        },
      }),
      db.bimElementLink.count({
        where: {
          entityType: 'Defect',
          model: { projectId: params.projectId },
        },
      }),
    ]);

    if (links.length === 0) {
      return successResponse([], { page, pageSize: limit, total: 0, totalPages: 0 });
    }

    // Загружаем сами дефекты одним запросом по id-ам
    const defectIds = links.map((l) => l.entityId);
    const defects = await db.defect.findMany({
      where: { id: { in: defectIds } },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        deadline: true,
        resolvedAt: true,
        createdAt: true,
        author: { select: { id: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Формируем итоговый список: BimElementLink + данные дефекта
    const defectMap = new Map(defects.map((d) => [d.id, d]));
    const issues = links.map((link) => ({
      linkId: link.id,
      element: link.element,
      model: link.model,
      defect: defectMap.get(link.entityId) ?? null,
    }));

    return successResponse(issues, { page, pageSize: limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM issues GET failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
