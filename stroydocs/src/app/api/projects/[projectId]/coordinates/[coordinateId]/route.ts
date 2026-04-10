import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  constructionPhase: z.number().int().min(1).optional().nullable(),
});

// Проверка принадлежности точки координат к объекту организации
async function resolveCoordinate(coordinateId: string, projectId: string, organizationId: string) {
  return db.projectCoordinate.findFirst({
    where: {
      id: coordinateId,
      projectId,
      project: { organizationId },
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; coordinateId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const coord = await resolveCoordinate(
      params.coordinateId,
      params.projectId,
      session.user.organizationId
    );
    if (!coord) return errorResponse('Точка не найдена', 404);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const updated = await db.projectCoordinate.update({
      where: { id: params.coordinateId },
      data: {
        ...(parsed.data.latitude !== undefined && { latitude: parsed.data.latitude }),
        ...(parsed.data.longitude !== undefined && { longitude: parsed.data.longitude }),
        ...(parsed.data.constructionPhase !== undefined && {
          constructionPhase: parsed.data.constructionPhase,
        }),
      },
    });

    return successResponse(updated);
  } catch (err) {
    return errorResponse('Ошибка сервера', 500, err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; coordinateId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const coord = await resolveCoordinate(
      params.coordinateId,
      params.projectId,
      session.user.organizationId
    );
    if (!coord) return errorResponse('Точка не найдена', 404);

    await db.projectCoordinate.delete({ where: { id: params.coordinateId } });

    return successResponse({ deleted: true });
  } catch (err) {
    return errorResponse('Ошибка сервера', 500, err);
  }
}
