import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { uploadFile } from '@/lib/s3-utils';
import { logger } from '@/lib/logger';
import type { DefectStatus } from '@prisma/client';

const IFC_SERVICE = process.env.IFC_SERVICE_URL ?? 'http://localhost:8001';

/** Типизированный ответ IFC-сервиса */
interface BcfTopicResponse {
  guid: string;
  title: string;
  description: string;
  status: string;
  ifcGuids: string[];
}

/** Маппинг BCF статуса → DefectStatus */
function mapBcfStatusToDefect(raw: string): DefectStatus {
  const lower = raw.toLowerCase();
  if (lower === 'open' || lower === 'active') return 'OPEN';
  if (lower === 'in progress') return 'IN_PROGRESS';
  if (lower === 'resolved') return 'RESOLVED';
  if (lower === 'closed' || lower === 'done') return 'CONFIRMED';
  return 'OPEN';
}

/**
 * POST /api/projects/[projectId]/bim/issues/import-bcf
 * Принимает .bcfzip (multipart), загружает в S3, передаёт в IFC-сервис
 * для разбора, затем создаёт Defect + BimElementLink для каждого топика.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта к организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Получаем файл из multipart-формы
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return errorResponse('Файл не передан', 400);

    // Валидация расширения
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.bcfzip') && !fileName.endsWith('.bcf')) {
      return errorResponse('Поддерживаются только файлы .bcfzip и .bcf', 400);
    }

    // Читаем файл в буфер
    const buffer = Buffer.from(await file.arrayBuffer());

    // Загружаем в S3
    const orgId = session.user.organizationId;
    const s3Key = `bcf/import/${orgId}/${Date.now()}.bcfzip`;
    await uploadFile(buffer, s3Key, 'application/octet-stream');

    // Вызов IFC-сервиса: POST /bcf/import
    const serviceRes = await fetch(`${IFC_SERVICE}/bcf/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ s3Key }),
    });

    if (!serviceRes.ok) {
      const errText = await serviceRes.text().catch(() => '');
      logger.error({ status: serviceRes.status, body: errText }, 'BCF import: IFC-сервис вернул ошибку');
      return errorResponse('Ошибка BCF-сервиса', 502);
    }

    const topics = await serviceRes.json() as BcfTopicResponse[];

    if (!Array.isArray(topics)) {
      logger.error({ topics }, 'BCF import: IFC-сервис вернул неожиданный формат');
      return errorResponse('Ошибка BCF-сервиса', 502);
    }

    let imported = 0;

    // Создаём Defect + BimElementLink для каждого топика
    for (const topic of topics) {
      // Ищем BimElement по IFC GUID в рамках проекта
      const elements =
        topic.ifcGuids.length > 0
          ? await db.bimElement.findMany({
              where: {
                ifcGuid: { in: topic.ifcGuids },
                model: { projectId: params.projectId },
              },
              select: { id: true, ifcGuid: true, modelId: true },
            })
          : [];

      // Создаём дефект
      const defect = await db.defect.create({
        data: {
          title: topic.title,
          description: topic.description || undefined,
          status: mapBcfStatusToDefect(topic.status),
          projectId: params.projectId,
          authorId: session.user.id,
        },
      });

      // Создаём BimElementLink для каждого найденного элемента
      for (const el of elements) {
        await db.bimElementLink.upsert({
          where: {
            elementId_entityType_entityId: {
              elementId: el.id,
              entityType: 'Defect',
              entityId: defect.id,
            },
          },
          create: {
            elementId: el.id,
            modelId: el.modelId,
            entityType: 'Defect',
            entityId: defect.id,
          },
          update: {},
        });
      }

      imported++;
    }

    logger.info({ imported, projectId: params.projectId }, 'BCF import завершён');
    return successResponse({ imported });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BCF import failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
