import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createLandPlotSchema } from '@/lib/validations/land-plot';

export const dynamic = 'force-dynamic';

async function verifyObjectAccess(projectId: string, organizationId: string) {
  return db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
}

// GET — список земельных участков проекта с организациями-владельцами и арендаторами
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const object = await verifyObjectAccess(params.projectId, session.user.organizationId);
    if (!object) return errorResponse('Объект не найден', 404);

    const plots = await db.landPlot.findMany({
      where: { projectId: params.projectId },
      include: {
        ownerOrg: { select: { id: true, name: true } },
        tenantOrg: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(plots);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения земельных участков');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// POST — создание земельного участка
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const object = await verifyObjectAccess(params.projectId, session.user.organizationId);
    if (!object) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = createLandPlotSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { inspectionDate, gpzuDate, ...rest } = parsed.data;

    const plot = await db.landPlot.create({
      data: {
        ...rest,
        projectId: params.projectId,
        // Конвертация строковых дат в объекты Date
        inspectionDate: inspectionDate ? new Date(inspectionDate) : null,
        gpzuDate: gpzuDate ? new Date(gpzuDate) : null,
      },
      include: {
        ownerOrg: { select: { id: true, name: true } },
        tenantOrg: { select: { id: true, name: true } },
      },
    });

    return successResponse(plot);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания земельного участка');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
