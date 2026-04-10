import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { addParticipantSchema } from '@/lib/validations/participants';

export const dynamic = 'force-dynamic';

/**
 * GET — список участников объекта (юрлица + физлица) с ролями.
 * Возвращает структуру { orgs, persons } для двухколоночного UI.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем принадлежность объекта организации пользователя
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const [orgs, persons] = await Promise.all([
      db.objectOrganization.findMany({
        where: { buildingObjectId: params.projectId },
        include: {
          organization: { select: { id: true, name: true, inn: true, sroNumber: true } },
          roles: { select: { id: true, roleName: true }, orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      db.objectPerson.findMany({
        where: { buildingObjectId: params.projectId },
        include: {
          organization: { select: { id: true, name: true } },
          roles: { select: { id: true, roleName: true }, orderBy: { createdAt: 'asc' } },
          appointments: {
            select: { id: true, documentType: true, isActive: true },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return successResponse({ orgs, persons });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения участников объекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/**
 * POST — добавить участника (юрлицо или физлицо).
 * Тело: { type: 'org', organizationId? } | { type: 'org', name, inn, address? }
 *      | { type: 'person', firstName, lastName, middleName?, organizationId?, linkedUserId? }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = addParticipantSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const data = parsed.data;

    if (data.type === 'org') {
      let orgId = data.organizationId;

      // Если organizationId не передан — создаём новую организацию
      if (!orgId) {
        if (!data.name || !data.inn) {
          return errorResponse('Для создания организации укажите наименование и ИНН', 400);
        }
        const newOrg = await db.organization.create({
          data: {
            name: data.name,
            inn: data.inn,
            address: data.address,
          },
        });
        orgId = newOrg.id;
      } else {
        // Проверяем существование организации
        const org = await db.organization.findUnique({ where: { id: orgId } });
        if (!org) return errorResponse('Организация не найдена', 404);
      }

      // Создаём привязку (обрабатываем дубль)
      try {
        const result = await db.objectOrganization.create({
          data: { buildingObjectId: params.projectId, organizationId: orgId },
          include: {
            organization: { select: { id: true, name: true, inn: true, sroNumber: true } },
            roles: true,
          },
        });
        return successResponse(result);
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          return errorResponse('Организация уже добавлена к этому объекту', 409);
        }
        throw e;
      }
    } else {
      // type === 'person'
      const result = await db.objectPerson.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName,
          organizationId: data.organizationId,
          linkedUserId: data.linkedUserId,
          buildingObjectId: params.projectId,
        },
        include: {
          organization: { select: { id: true, name: true } },
          roles: true,
          appointments: true,
        },
      });
      return successResponse(result);
    }
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка добавления участника объекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
