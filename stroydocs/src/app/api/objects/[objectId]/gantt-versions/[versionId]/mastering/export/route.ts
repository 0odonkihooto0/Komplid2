import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse } from '@/utils/api';
import { exportMasteringToExcel } from '@/lib/gantt/export-mastering';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(2000)
    .max(2100)
    .default(new Date().getFullYear()),
});

/**
 * GET /api/objects/[objectId]/gantt-versions/[versionId]/mastering/export?year=2025
 * Возвращает план освоения версии ГПР в формате xlsx (два листа: суммы и объёмы).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { objectId: string; versionId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации (multi-tenancy)
    const object = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    // Проверка что версия принадлежит данному объекту
    const version = await db.ganttVersion.findFirst({
      where: { id: params.versionId, projectId: params.objectId },
    });
    if (!version) return errorResponse('Версия ГПР не найдена', 404);

    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = querySchema.safeParse(searchParams);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { year } = parsed.data;
    const buffer = await exportMasteringToExcel(params.versionId, year);

    const filename = encodeURIComponent(`План_освоения_${year}.xlsx`);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка экспорта плана освоения ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
