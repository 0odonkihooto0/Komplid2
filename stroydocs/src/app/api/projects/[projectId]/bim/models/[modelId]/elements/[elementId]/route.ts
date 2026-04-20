import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
/** GET /api/projects/[projectId]/bim/models/[modelId]/elements/[elementId]
 *  Полные данные элемента ТИМ-модели: IFC PropertySets и список связей.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; modelId: string; elementId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверить принадлежность через модель → проект → организацию
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
        links: {
          select: {
            id: true,
            entityType: true,
            entityId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!element) return errorResponse('Элемент не найден', 404);

    // Обогащаем ссылки читаемыми именами сущностей (число, заголовок, статус)
    const links = element.links;
    const execIds = links.filter((l) => l.entityType === 'ExecutionDoc').map((l) => l.entityId);
    const ks2Ids  = links.filter((l) => l.entityType === 'Ks2Act').map((l) => l.entityId);
    const defIds  = links.filter((l) => l.entityType === 'Defect').map((l) => l.entityId);

    const [execDocs, ks2Acts, defects] = await Promise.all([
      execIds.length
        ? db.executionDoc.findMany({
            where: { id: { in: execIds } },
            select: { id: true, number: true, title: true, status: true },
          })
        : Promise.resolve([]),
      ks2Ids.length
        ? db.ks2Act.findMany({
            where: { id: { in: ks2Ids } },
            select: { id: true, number: true, status: true },
          })
        : Promise.resolve([]),
      defIds.length
        ? db.defect.findMany({
            where: { id: { in: defIds } },
            select: { id: true, title: true, status: true },
          })
        : Promise.resolve([]),
    ]);

    // Карты id → данные для быстрого поиска
    const execMap = new Map(execDocs.map((d) => [d.id, d]));
    const ks2Map  = new Map(ks2Acts.map((k) => [k.id, k]));
    const defMap  = new Map(defects.map((d) => [d.id, d]));

    const enrichedLinks = links.map((link) => {
      let entityLabel: string | undefined;
      let entityStatus: string | undefined;

      if (link.entityType === 'ExecutionDoc') {
        const doc = execMap.get(link.entityId);
        if (doc) {
          entityLabel  = [doc.number, doc.title].filter(Boolean).join(' ') || undefined;
          entityStatus = doc.status;
        }
      } else if (link.entityType === 'Ks2Act') {
        const ks2 = ks2Map.get(link.entityId);
        if (ks2) {
          entityLabel  = ks2.number != null ? `КС-2 №${ks2.number}` : undefined;
          entityStatus = ks2.status;
        }
      } else if (link.entityType === 'Defect') {
        const def = defMap.get(link.entityId);
        if (def) {
          entityLabel  = def.title ?? undefined;
          entityStatus = def.status;
        }
      }

      return { ...link, entityLabel, entityStatus };
    });

    return successResponse({ ...element, links: enrichedLinks });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM element [elementId] GET failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
