import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { loadCorrectionFromFile } from '@/lib/estimates/load-correction';
import { logEstimateChange } from '@/lib/estimates/change-log';

export const dynamic = 'force-dynamic';

/**
 * POST — загрузить корректировочную смету из файла (gsfx/gge/xml).
 * Парсит файл, создаёт CORRECTIVE версию с parentVersionId = текущая версия.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; versionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const version = await db.estimateVersion.findFirst({
      where: { id: params.versionId, contractId: params.contractId },
    });
    if (!version) return errorResponse('Версия не найдена', 404);

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return errorResponse('Файл не загружен', 400);
    }

    const fileName = (file as File).name ?? 'unknown.xml';
    const ext = fileName.toLowerCase().split('.').pop();
    if (!ext || !['xml', 'gsfx', 'gge'].includes(ext)) {
      return errorResponse('Неподдерживаемый формат файла. Допустимы: xml, gsfx, gge', 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const newVersion = await loadCorrectionFromFile(
      params.versionId, buffer, fileName, params.contractId, session.user.id
    );

    await logEstimateChange({
      versionId: params.versionId,
      userId: session.user.id,
      action: 'correction_loaded',
      newValue: newVersion.id,
    });

    logger.info(
      { parentVersionId: params.versionId, newVersionId: newVersion.id },
      'Корректировочная смета загружена'
    );

    return successResponse(newVersion);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка загрузки корректировочной сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
