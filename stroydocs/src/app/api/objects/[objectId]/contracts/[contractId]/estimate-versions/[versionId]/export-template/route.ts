import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { exportVersionTemplate } from '@/lib/estimates/export-template';

export const dynamic = 'force-dynamic';

/**
 * GET — экспорт версии сметы в Excel-шаблон формата ЦУС.
 * Возвращает .xlsx файл (лист «Смета» + лист «info»).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; versionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const version = await db.estimateVersion.findFirst({
      where: { id: params.versionId, contractId: params.contractId },
    });
    if (!version) return errorResponse('Версия не найдена', 404);

    const buffer = await exportVersionTemplate(params.versionId);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="estimate-template-${params.versionId.slice(0, 8)}.xlsx"`,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка экспорта шаблона сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
