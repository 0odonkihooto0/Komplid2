import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
/** POST /api/projects/[projectId]/bim/models/[modelId]/elements/[elementId]/refresh-properties
 *  Вызывает IfcOpenShell-сервис для получения PropertySets элемента по GUID
 *  и сохраняет результат в BimElement.properties.
 *  Используется для старых моделей, у которых properties = null (до миграции Task 2).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { projectId: string; modelId: string; elementId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверить принадлежность элемента через модель → проект → организацию
    const element = await db.bimElement.findFirst({
      where: {
        id: params.elementId,
        modelId: params.modelId,
        model: {
          projectId: params.projectId,
          buildingObject: { organizationId: session.user.organizationId },
        },
      },
      include: {
        model: { select: { s3Key: true } },
      },
    });

    if (!element) return errorResponse('Элемент не найден', 404);

    const ifcServiceUrl = process.env.IFC_SERVICE_URL;
    if (!ifcServiceUrl) return errorResponse('IFC_SERVICE_URL не задан', 500);

    // Вызвать IfcOpenShell-сервис для получения PropertySets
    let ifcRes: Response;
    try {
      ifcRes = await fetch(`${ifcServiceUrl}/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Key: element.model.s3Key, ifcGuid: element.ifcGuid }),
      });
    } catch (err) {
      logger.error({ err }, 'IfcOpenShell-сервис недоступен при refresh-properties');
      return errorResponse('IfcOpenShell-сервис недоступен', 502);
    }

    if (!ifcRes.ok) {
      const body = await ifcRes.text().catch(() => '');
      logger.error({ status: ifcRes.status, body }, 'IfcOpenShell /properties вернул ошибку');
      return errorResponse(`IfcOpenShell-сервис: ${ifcRes.status}`, 502);
    }

    const data = await ifcRes.json() as { propertySets: Record<string, Record<string, unknown>> };

    // Сохранить PropertySets в БД
    const updated = await db.bimElement.update({
      where: { id: element.id },
      data: { properties: data.propertySets as Prisma.InputJsonValue },
    });

    logger.info({ elementId: element.id, ifcGuid: element.ifcGuid }, 'PropertySets обновлены');
    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM element refresh-properties POST failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
