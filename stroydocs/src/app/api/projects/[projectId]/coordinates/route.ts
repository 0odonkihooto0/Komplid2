import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  constructionPhase: z.number().int().min(1).optional().nullable(),
});

// Проверка принадлежности объекта к организации
async function resolveProject(projectId: string, organizationId: string) {
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
    const project = await resolveProject(params.projectId, session.user.organizationId);
    if (!project) return errorResponse('Объект не найден', 404);

    const coordinates = await db.projectCoordinate.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(coordinates);
  } catch (err) {
    return errorResponse('Ошибка сервера', 500, err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const project = await resolveProject(params.projectId, session.user.organizationId);
    if (!project) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const coordinate = await db.projectCoordinate.create({
      data: {
        projectId: params.projectId,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        constructionPhase: parsed.data.constructionPhase ?? null,
      },
    });

    return successResponse(coordinate);
  } catch (err) {
    return errorResponse('Ошибка сервера', 500, err);
  }
}
