import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { createLinkSchema } from '@/lib/validations/bim';

/** GET /api/projects/[projectId]/bim/links
 *  Связи элементов ТИМ с сущностями системы.
 *  Обязателен один из параметров: ?entityType=GanttTask или ?elementId=<uuid>
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
    const entityType = searchParams.get('entityType');
    const elementId = searchParams.get('elementId');

    if (!entityType && !elementId) {
      return errorResponse('Укажите параметр entityType или elementId', 400);
    }

    const links = await db.bimElementLink.findMany({
      where: {
        model: { projectId: params.projectId },
        ...(entityType ? { entityType } : {}),
        ...(elementId ? { elementId } : {}),
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        element: { select: { id: true, ifcGuid: true, ifcType: true, name: true } },
      },
    });

    return successResponse(links);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM links GET failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}

/** POST /api/projects/[projectId]/bim/links — создать связь элемент ↔ сущность */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = createLinkSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { elementId, modelId, entityType, entityId } = parsed.data;

    // Проверить что элемент и модель принадлежат этому проекту
    const element = await db.bimElement.findFirst({
      where: {
        id: elementId,
        modelId,
        model: { projectId: params.projectId },
      },
    });
    if (!element) return errorResponse('Элемент не найден', 404);

    // Создать связь; уникальный индекс [elementId, entityType, entityId] предотвратит дубли
    const link = await db.bimElementLink.create({
      data: { elementId, modelId, entityType, entityId },
    });

    return successResponse(link);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    // P2002 = уникальность нарушена (связь уже существует)
    if ((error as { code?: string }).code === 'P2002') {
      return errorResponse('Связь уже существует', 409);
    }
    logger.error({ err: error }, 'BIM links POST failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
