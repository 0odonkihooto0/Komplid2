import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { getDownloadUrl } from '@/lib/s3-utils';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
const IFC_SERVICE = process.env.IFC_SERVICE_URL ?? 'http://localhost:8001';
const MAX_ISSUES = 200;

/** Маппинг DefectStatus → BCF 2.1 статус */
function mapDefectStatusToBcf(status: string): string {
  const map: Record<string, string> = {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
    CONFIRMED: 'Closed',
    REJECTED: 'Closed',
  };
  return map[status] ?? 'Open';
}

/**
 * GET /api/projects/[projectId]/bim/issues/export-bcf
 * Собирает замечания ЦИМ, передаёт в IFC-сервис для упаковки в BCF 2.1,
 * возвращает pre-signed URL для скачивания .bcfzip.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта к организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Загружаем BimElementLink (entityType='Defect') без пагинации — макс 200
    const links = await db.bimElementLink.findMany({
      where: {
        entityType: 'Defect',
        model: { projectId: params.projectId },
      },
      take: MAX_ISSUES,
      orderBy: { createdAt: 'desc' },
      include: {
        element: { select: { ifcGuid: true } },
      },
    });

    if (links.length === 0) {
      return errorResponse('Нет замечаний для экспорта', 400);
    }

    // Загружаем данные дефектов одним запросом
    const defectIds = links.map((l) => l.entityId);
    const defects = await db.defect.findMany({
      where: { id: { in: defectIds } },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        author: { select: { firstName: true, lastName: true } },
      },
    });
    const defectMap = new Map(defects.map((d) => [d.id, d]));

    // Формируем payload для IFC-сервиса
    const issues = links.map((link) => {
      const defect = defectMap.get(link.entityId);
      const authorName = defect?.author
        ? `${defect.author.firstName ?? ''} ${defect.author.lastName ?? ''}`.trim()
        : '';
      return {
        guid: link.id,
        title: defect?.title ?? 'Замечание',
        description: defect?.description ?? '',
        author: authorName,
        ifcGuids: [link.element.ifcGuid],
        status: mapDefectStatusToBcf(defect?.status ?? 'OPEN'),
      };
    });

    // Вызов IFC-сервиса: POST /bcf/export
    const serviceRes = await fetch(`${IFC_SERVICE}/bcf/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issues }),
    });

    if (!serviceRes.ok) {
      const errText = await serviceRes.text().catch(() => '');
      logger.error({ status: serviceRes.status, body: errText }, 'BCF export: IFC-сервис вернул ошибку');
      return errorResponse('Ошибка BCF-сервиса', 502);
    }

    const serviceData = await serviceRes.json() as { s3Key: string };
    if (!serviceData.s3Key) {
      logger.error({ serviceData }, 'BCF export: IFC-сервис не вернул s3Key');
      return errorResponse('Ошибка BCF-сервиса', 502);
    }

    // Генерируем pre-signed URL для скачивания
    const url = await getDownloadUrl(serviceData.s3Key);
    return successResponse({ url });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BCF export failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
