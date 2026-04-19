import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateCameraSchema = z.object({
  cameraNumber: z.string().optional(),
  locationName: z.string().optional(),
  operationalStatus: z.enum(['Работает', 'Не работает']).optional(),
  cameraModel: z.string().optional(),
  rtspUrl: z.string().optional(),
  httpUrl: z.string().min(1).optional(),
  failureReason: z.string().optional(),
  s3Keys: z.array(z.string()).optional(),
  fileNames: z.array(z.string()).optional(),
});

async function verifyAccess(projectId: string, cameraId: string, organizationId: string) {
  const object = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
  if (!object) return { error: 'Объект не найден' };

  const camera = await db.videoCamera.findFirst({
    where: { id: cameraId, projectId: projectId },
  });
  if (!camera) return { error: 'Камера не найдена' };

  return { camera };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; cameraId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const { camera, error } = await verifyAccess(
      params.projectId,
      params.cameraId,
      session.user.organizationId
    );
    if (error || !camera) return errorResponse(error ?? 'Не найдено', 404);

    const body = await req.json();
    const parsed = updateCameraSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.videoCamera.update({
      where: { id: params.cameraId },
      data: parsed.data,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления камеры видеонаблюдения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; cameraId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const { error } = await verifyAccess(
      params.projectId,
      params.cameraId,
      session.user.organizationId
    );
    if (error) return errorResponse(error, 404);

    await db.videoCamera.delete({ where: { id: params.cameraId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления камеры видеонаблюдения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
