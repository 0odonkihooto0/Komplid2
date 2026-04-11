import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const createLevelSchema = z.object({
  level: z.number().int().min(0, 'Номер уровня не может быть отрицательным'),
  userId: z.string().min(1, 'ID пользователя обязателен'),
  requiresPreviousApproval: z.boolean().optional(),
});

type Params = { params: { orgId: string; tid: string } };

/**
 * GET /api/organizations/[orgId]/approval-templates/[tid]/levels
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Нет доступа к этой организации', 403);
    }

    const template = await db.approvalTemplate.findFirst({
      where: { id: params.tid, organizationId: params.orgId },
    });
    if (!template) return errorResponse('Шаблон не найден', 404);

    const levels = await db.approvalTemplateLevel.findMany({
      where: { templateId: params.tid },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { level: 'asc' },
    });

    return successResponse(levels);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения уровней шаблона');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/**
 * POST /api/organizations/[orgId]/approval-templates/[tid]/levels
 * Добавить уровень согласования в шаблон.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Нет доступа к этой организации', 403);
    }

    const template = await db.approvalTemplate.findFirst({
      where: { id: params.tid, organizationId: params.orgId },
    });
    if (!template) return errorResponse('Шаблон не найден', 404);

    const body = await req.json();
    const parsed = createLevelSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { level, userId, requiresPreviousApproval } = parsed.data;

    // Проверить что пользователь принадлежит организации
    const user = await db.user.findFirst({
      where: { id: userId, organizationId: params.orgId },
    });
    if (!user) return errorResponse('Пользователь не найден в организации', 404);

    const newLevel = await db.approvalTemplateLevel.create({
      data: {
        templateId: params.tid,
        level,
        userId,
        requiresPreviousApproval: requiresPreviousApproval ?? true,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(newLevel);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания уровня шаблона');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
