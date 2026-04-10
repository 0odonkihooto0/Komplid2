import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { updateLandPlotSchema } from '@/lib/validations/land-plot';

export const dynamic = 'force-dynamic';

async function verifyObjectAccess(projectId: string, organizationId: string) {
  return db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
}

// GET — получение одного земельного участка с техническими условиями
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; plotId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const object = await verifyObjectAccess(params.projectId, session.user.organizationId);
    if (!object) return errorResponse('Объект не найден', 404);

    const plot = await db.landPlot.findFirst({
      where: { id: params.plotId, projectId: params.projectId },
      include: {
        ownerOrg: { select: { id: true, name: true } },
        tenantOrg: { select: { id: true, name: true } },
        // Подсчёт количества технических условий без загрузки всего списка
        _count: { select: { technicalConditions: true } },
      },
    });

    if (!plot) return errorResponse('Земельный участок не найден', 404);

    return successResponse(plot);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения земельного участка');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// PUT — обновление земельного участка
export async function PUT(
  req: NextRequest,
  { params }: { params: { projectId: string; plotId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const object = await verifyObjectAccess(params.projectId, session.user.organizationId);
    if (!object) return errorResponse('Объект не найден', 404);

    // Проверяем что участок принадлежит этому проекту
    const existing = await db.landPlot.findFirst({
      where: { id: params.plotId, projectId: params.projectId },
      select: { id: true },
    });
    if (!existing) return errorResponse('Земельный участок не найден', 404);

    const body = await req.json();
    const parsed = updateLandPlotSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { inspectionDate, gpzuDate, ...rest } = parsed.data;

    // Формируем объект с конвертацией дат только при наличии новых значений
    const updateData: Record<string, unknown> = { ...rest };
    if (inspectionDate !== undefined) {
      updateData.inspectionDate = inspectionDate ? new Date(inspectionDate) : null;
    }
    if (gpzuDate !== undefined) {
      updateData.gpzuDate = gpzuDate ? new Date(gpzuDate) : null;
    }

    const plot = await db.landPlot.update({
      where: { id: params.plotId },
      data: updateData,
      include: {
        ownerOrg: { select: { id: true, name: true } },
        tenantOrg: { select: { id: true, name: true } },
      },
    });

    return successResponse(plot);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления земельного участка');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// DELETE — удаление земельного участка
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; plotId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const object = await verifyObjectAccess(params.projectId, session.user.organizationId);
    if (!object) return errorResponse('Объект не найден', 404);

    // Проверяем принадлежность участка к проекту перед удалением
    const existing = await db.landPlot.findFirst({
      where: { id: params.plotId, projectId: params.projectId },
      select: { id: true },
    });
    if (!existing) return errorResponse('Земельный участок не найден', 404);

    await db.landPlot.delete({ where: { id: params.plotId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления земельного участка');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
