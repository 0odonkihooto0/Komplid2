import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateLevelSchema = z.object({
  level: z.number().int().min(0).optional(),
  userId: z.string().min(1).optional(),
  requiresPreviousApproval: z.boolean().optional(),
});

type Params = { params: { orgId: string; tid: string; levelId: string } };

/** Найти уровень с проверкой принадлежности к шаблону и организации */
async function findLevel(orgId: string, tid: string, levelId: string) {
  return db.approvalTemplateLevel.findFirst({
    where: {
      id: levelId,
      templateId: tid,
      template: { organizationId: orgId },
    },
  });
}

/**
 * PATCH /api/organizations/[orgId]/approval-templates/[tid]/levels/[levelId]
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Нет доступа к этой организации', 403);
    }

    const lvl = await findLevel(params.orgId, params.tid, params.levelId);
    if (!lvl) return errorResponse('Уровень не найден', 404);

    const body = await req.json();
    const parsed = updateLevelSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Если меняется userId — проверить принадлежность к организации
    if (parsed.data.userId) {
      const user = await db.user.findFirst({
        where: { id: parsed.data.userId, organizationId: params.orgId },
      });
      if (!user) return errorResponse('Пользователь не найден в организации', 404);
    }

    const updated = await db.approvalTemplateLevel.update({
      where: { id: params.levelId },
      data: {
        ...(parsed.data.level !== undefined && { level: parsed.data.level }),
        ...(parsed.data.userId !== undefined && { userId: parsed.data.userId }),
        ...(parsed.data.requiresPreviousApproval !== undefined && {
          requiresPreviousApproval: parsed.data.requiresPreviousApproval,
        }),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления уровня шаблона');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/**
 * DELETE /api/organizations/[orgId]/approval-templates/[tid]/levels/[levelId]
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Нет доступа к этой организации', 403);
    }

    const lvl = await findLevel(params.orgId, params.tid, params.levelId);
    if (!lvl) return errorResponse('Уровень не найден', 404);

    await db.approvalTemplateLevel.delete({ where: { id: params.levelId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления уровня шаблона');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
