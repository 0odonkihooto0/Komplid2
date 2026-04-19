import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const createCameraSchema = z.object({
  cameraNumber: z.string().optional(),
  locationName: z.string().optional(),
  operationalStatus: z.enum(['Работает', 'Не работает']).default('Работает'),
  cameraModel: z.string().optional(),
  rtspUrl: z.string().optional(),
  httpUrl: z.string().min(1, 'Укажите HTTP ссылку'),
  failureReason: z.string().optional(),
  s3Keys: z.array(z.string()).default([]),
  fileNames: z.array(z.string()).default([]),
});

async function verifyObjectAccess(projectId: string, organizationId: string) {
  return db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const object = await verifyObjectAccess(params.projectId, session.user.organizationId);
    if (!object) return errorResponse('Объект не найден', 404);

    const cameras = await db.videoCamera.findMany({
      where: { projectId: params.projectId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(cameras);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения камер видеонаблюдения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const object = await verifyObjectAccess(params.projectId, session.user.organizationId);
    if (!object) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = createCameraSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const camera = await db.videoCamera.create({
      data: {
        ...parsed.data,
        projectId: params.projectId,
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(camera);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания камеры видеонаблюдения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
