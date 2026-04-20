import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { getDownloadUrl } from '@/lib/s3-utils';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
const IFC_SERVICE = process.env.IFC_SERVICE_URL ?? 'http://localhost:8001';

/** Ответ IFC-сервиса POST /csv */
interface IfcCsvServiceResponse {
  s3Key: string;
  elementCount: number;
}

/**
 * GET /api/projects/[projectId]/bim/models/[modelId]/export-csv?ifcType=IfcWall
 *
 * Экспорт элементов IFC-модели в CSV через IfcOpenShell-сервис.
 * Параметр ifcType (опционально): тип элементов (IfcWall, IfcSlab и т.д.).
 * По умолчанию — IfcProduct (все элементы).
 *
 * Возвращает: { url: string } — presigned URL для скачивания CSV.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; modelId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const ifcType = req.nextUrl.searchParams.get('ifcType') ?? 'IfcProduct';

    // Проверяем принадлежность модели организации (multi-tenancy)
    const model = await db.bimModel.findFirst({
      where: {
        id: params.modelId,
        projectId: params.projectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true, s3Key: true },
    });

    if (!model) return errorResponse('Модель не найдена', 404);

    // Вызываем IFC-сервис POST /csv
    let serviceData: IfcCsvServiceResponse;
    try {
      const serviceRes = await fetch(`${IFC_SERVICE}/csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Key: model.s3Key, query: ifcType }),
      });

      if (!serviceRes.ok) {
        const detail = await serviceRes.text().catch(() => '');
        logger.error(
          { status: serviceRes.status, detail },
          'IFC-сервис вернул ошибку при CSV-экспорте'
        );
        return errorResponse('Ошибка IFC-сервиса при экспорте CSV', 502);
      }

      serviceData = (await serviceRes.json()) as IfcCsvServiceResponse;
    } catch (fetchErr) {
      logger.error({ err: fetchErr }, 'Не удалось подключиться к IFC-сервису для CSV-экспорта');
      return errorResponse('IFC-сервис недоступен', 502);
    }

    if (!serviceData.s3Key) {
      return errorResponse('IFC-сервис не вернул s3Key', 502);
    }

    // Генерируем presigned URL для скачивания CSV (TTL 1 час)
    const url = await getDownloadUrl(serviceData.s3Key);

    logger.info(
      { modelId: params.modelId, ifcType, elementCount: serviceData.elementCount },
      'CSV-экспорт завершён'
    );

    return successResponse({ url });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'CSV export failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
