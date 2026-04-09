import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; contractId: string; versionId: string } };

async function resolveVersion(projectId: string, contractId: string, versionId: string, orgId: string) {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId: orgId },
  });
  if (!project) return null;

  const version = await db.estimateVersion.findFirst({
    where: { id: versionId, contractId },
  });
  return version;
}

/** GET — версия сметы с главами и позициями */
export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSessionOrThrow();
    const version = await resolveVersion(
      params.objectId, params.contractId, params.versionId, session.user.organizationId
    );
    if (!version) return errorResponse('Версия не найдена', 404);

    const fullVersion = await db.estimateVersion.findUnique({
      where: { id: params.versionId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        chapters: {
          orderBy: { order: 'asc' },
          include: {
            children: {
              orderBy: { order: 'asc' },
              include: {
                items: {
                  where: { isDeleted: false },
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
            items: {
              where: { isDeleted: false },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    return successResponse(fullVersion);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения версии сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const patchVersionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  isActual: z.boolean().optional(),
  period: z.string().max(50).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

/** PATCH — обновить версию (нельзя изменять тип BASELINE) */
export async function PATCH(
  req: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSessionOrThrow();
    const version = await resolveVersion(
      params.objectId, params.contractId, params.versionId, session.user.organizationId
    );
    if (!version) return errorResponse('Версия не найдена', 404);

    if (version.isBaseline) {
      return errorResponse('Базовая версия (Baseline) не редактируется', 400);
    }

    const body = await req.json();
    const parsed = patchVersionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const data = parsed.data;

    const updated = await db.estimateVersion.update({
      where: { id: params.versionId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.isActual !== undefined && { isActual: data.isActual }),
        ...(data.period !== undefined && { period: data.period }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления версии сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** DELETE — удалить версию (нельзя удалять Baseline) */
export async function DELETE(
  _req: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSessionOrThrow();
    const version = await resolveVersion(
      params.objectId, params.contractId, params.versionId, session.user.organizationId
    );
    if (!version) return errorResponse('Версия не найдена', 404);

    if (version.isBaseline) {
      return errorResponse('Нельзя удалить базовую версию (Baseline)', 400);
    }

    await db.estimateVersion.delete({ where: { id: params.versionId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления версии сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
