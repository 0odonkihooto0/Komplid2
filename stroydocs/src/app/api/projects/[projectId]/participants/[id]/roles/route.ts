import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { addRoleSchema } from '@/lib/validations/participants';

export const dynamic = 'force-dynamic';

/**
 * POST — добавить роль участнику (юрлицу или физлицу).
 * Тело: { roleName: string; participantType: 'org' | 'person' }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; id: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = addRoleSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { roleName, participantType } = parsed.data;

    if (participantType === 'org') {
      // Проверяем что юрлицо принадлежит данному объекту
      const orgParticipant = await db.objectOrganization.findFirst({
        where: { id: params.id, buildingObjectId: params.projectId },
      });
      if (!orgParticipant) return errorResponse('Участник не найден', 404);

      const role = await db.objectParticipantRole.create({
        data: { roleName, orgParticipantId: params.id },
      });
      return successResponse(role);
    } else {
      // Проверяем что физлицо принадлежит данному объекту
      const person = await db.objectPerson.findFirst({
        where: { id: params.id, buildingObjectId: params.projectId },
      });
      if (!person) return errorResponse('Участник не найден', 404);

      const role = await db.objectParticipantRole.create({
        data: { roleName, personId: params.id },
      });
      return successResponse(role);
    }
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка добавления роли участнику');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
