import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateStampTitleSchema = z.object({
  name: z.string().min(1).optional(),
  template: z.string().nullable().optional(),
});

type Params = { params: { orgId: string; titleId: string } };

/** Найти запись справочника с проверкой принадлежности организации */
async function findTitle(orgId: string, titleId: string) {
  return db.stampTitle.findFirst({
    where: { id: titleId, organizationId: orgId },
  });
}

/**
 * PATCH /api/organizations/[orgId]/stamp-titles/[titleId]
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Нет доступа к этой организации', 403);
    }

    const title = await findTitle(params.orgId, params.titleId);
    if (!title) return errorResponse('Запись не найдена', 404);

    const body = await req.json();
    const parsed = updateStampTitleSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.stampTitle.update({
      where: { id: params.titleId },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.template !== undefined && { template: parsed.data.template }),
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления титула штампа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/**
 * DELETE /api/organizations/[orgId]/stamp-titles/[titleId]
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Нет доступа к этой организации', 403);
    }

    const title = await findTitle(params.orgId, params.titleId);
    if (!title) return errorResponse('Запись не найдена', 404);

    await db.stampTitle.delete({ where: { id: params.titleId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления титула штампа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
