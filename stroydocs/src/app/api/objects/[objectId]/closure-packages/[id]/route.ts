import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; id: string } };

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  number: z.string().min(1).optional(),
  notes: z.string().optional(),
  status: z.enum(['DRAFT', 'ASSEMBLED', 'EXPORTED', 'ACCEPTED']).optional(),
  executionDocIds: z.array(z.string().uuid()).optional(),
  registryIds: z.array(z.string().uuid()).optional(),
  archiveDocIds: z.array(z.string().uuid()).optional(),
});

/** Проверка multi-tenancy: объект принадлежит организации пользователя */
async function verifyAccess(objectId: string, packageId: string, orgId: string) {
  const project = await db.buildingObject.findFirst({
    where: { id: objectId, organizationId: orgId },
    select: { id: true },
  });
  if (!project) return { error: errorResponse('Проект не найден', 404) };

  const pkg = await db.idClosurePackage.findFirst({
    where: { id: packageId, projectId: objectId },
    include: {
      createdBy: {
        select: { firstName: true, lastName: true, middleName: true },
      },
    },
  });
  if (!pkg) return { error: errorResponse('Пакет не найден', 404) };

  return { project, pkg };
}

/** GET — получить закрывающий пакет по ID */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const result = await verifyAccess(params.objectId, params.id, session.user.organizationId);
    if ('error' in result) return result.error;

    return successResponse(result.pkg);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения закрывающего пакета');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** PATCH — обновить закрывающий пакет */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const result = await verifyAccess(params.objectId, params.id, session.user.organizationId);
    if ('error' in result) return result.error;

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const updated = await db.idClosurePackage.update({
      where: { id: params.id },
      data: parsed.data,
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, middleName: true },
        },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления закрывающего пакета');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** DELETE — удалить закрывающий пакет (только DRAFT) */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const result = await verifyAccess(params.objectId, params.id, session.user.organizationId);
    if ('error' in result) return result.error;

    if (result.pkg.status !== 'DRAFT') {
      return errorResponse('Удалить можно только пакет в статусе DRAFT', 400);
    }

    await db.idClosurePackage.delete({ where: { id: params.id } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления закрывающего пакета');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
