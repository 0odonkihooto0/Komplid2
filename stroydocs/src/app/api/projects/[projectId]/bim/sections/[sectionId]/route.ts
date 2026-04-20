import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { updateSectionSchema } from '@/lib/validations/bim';

export const dynamic = 'force-dynamic';
type RouteParams = { params: { projectId: string; sectionId: string } };

/** Проверить принадлежность раздела организации через объект строительства */
async function getSection(sectionId: string, projectId: string, organizationId: string) {
  return db.bimSection.findFirst({
    where: {
      id: sectionId,
      projectId,
      buildingObject: { organizationId },
    },
  });
}

/** PATCH /api/projects/[projectId]/bim/sections/[sectionId] — переименовать раздел */
export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getSessionOrThrow();

    const section = await getSection(
      params.sectionId,
      params.projectId,
      session.user.organizationId
    );
    if (!section) return errorResponse('Раздел не найден', 404);

    const body = await req.json();
    const parsed = updateSectionSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const updated = await db.bimSection.update({
      where: { id: params.sectionId },
      data: { name: parsed.data.name },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM section PATCH failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}

/** DELETE /api/projects/[projectId]/bim/sections/[sectionId] — удалить раздел */
export async function DELETE(
  _req: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getSessionOrThrow();

    const section = await getSection(
      params.sectionId,
      params.projectId,
      session.user.organizationId
    );
    if (!section) return errorResponse('Раздел не найден', 404);

    // Каскадное удаление моделей и подразделов через Prisma onDelete: Cascade
    await db.bimSection.delete({ where: { id: params.sectionId } });

    return successResponse({ id: params.sectionId });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM section DELETE failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
