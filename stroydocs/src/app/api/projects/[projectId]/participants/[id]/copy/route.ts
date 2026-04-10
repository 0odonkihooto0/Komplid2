import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { copyParticipantSchema } from '@/lib/validations/participants';

export const dynamic = 'force-dynamic';

/**
 * POST — скопировать участника (юрлицо или физлицо) в другой объект.
 * Тело: { targetObjectId: string; participantType: 'org' | 'person' }
 * Копирует только базовую связь, без ролей и назначений.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; id: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем исходный объект
    const sourceProject = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!sourceProject) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = copyParticipantSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { targetObjectId, participantType } = parsed.data;

    // Целевой объект должен принадлежать той же организации
    const targetProject = await db.buildingObject.findFirst({
      where: { id: targetObjectId, organizationId: session.user.organizationId },
    });
    if (!targetProject) return errorResponse('Целевой объект не найден', 404);

    if (targetObjectId === params.projectId) {
      return errorResponse('Нельзя копировать участника в тот же объект', 400);
    }

    try {
      if (participantType === 'org') {
        const source = await db.objectOrganization.findFirst({
          where: { id: params.id, buildingObjectId: params.projectId },
        });
        if (!source) return errorResponse('Участник не найден', 404);

        const result = await db.objectOrganization.create({
          data: { buildingObjectId: targetObjectId, organizationId: source.organizationId },
          include: {
            organization: { select: { id: true, name: true, inn: true, sroNumber: true } },
            roles: true,
          },
        });
        return successResponse(result);
      } else {
        const source = await db.objectPerson.findFirst({
          where: { id: params.id, buildingObjectId: params.projectId },
        });
        if (!source) return errorResponse('Участник не найден', 404);

        const result = await db.objectPerson.create({
          data: {
            firstName: source.firstName,
            lastName: source.lastName,
            middleName: source.middleName,
            organizationId: source.organizationId,
            linkedUserId: source.linkedUserId,
            buildingObjectId: targetObjectId,
          },
          include: {
            organization: { select: { id: true, name: true } },
            roles: true,
            appointments: true,
          },
        });
        return successResponse(result);
      }
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return errorResponse('Участник уже добавлен к целевому объекту', 409);
      }
      throw e;
    }
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка копирования участника');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
