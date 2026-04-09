import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { createSectionSchema } from '@/lib/validations/bim';

/** Проверить принадлежность объекта организации и вернуть его */
async function getProject(projectId: string, organizationId: string) {
  return db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
  });
}

/** GET /api/projects/[projectId]/bim/sections — дерево разделов ТИМ */
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await getProject(params.projectId, session.user.organizationId);
    if (!project) return errorResponse('Объект не найден', 404);

    // Загружаем только корневые разделы; дочерние — рекурсивно через include
    const sections = await db.bimSection.findMany({
      where: { projectId: params.projectId, parentId: null },
      orderBy: { order: 'asc' },
      include: {
        children: {
          orderBy: { order: 'asc' },
          include: {
            children: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    return successResponse(sections);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM sections GET failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}

/** POST /api/projects/[projectId]/bim/sections — создать раздел */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await getProject(params.projectId, session.user.organizationId);
    if (!project) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = createSectionSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { name, parentId } = parsed.data;

    // Если указан родительский раздел — убедиться что он принадлежит этому проекту
    if (parentId) {
      const parent = await db.bimSection.findFirst({
        where: { id: parentId, projectId: params.projectId },
      });
      if (!parent) return errorResponse('Родительский раздел не найден', 404);
    }

    const section = await db.bimSection.create({
      data: {
        name,
        parentId: parentId ?? null,
        projectId: params.projectId,
        order: 0,
      },
    });

    return successResponse(section);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM sections POST failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
