import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

type Params = { params: { orgId: string; tid: string } };

/** Найти шаблон с проверкой принадлежности организации */
async function findTemplate(orgId: string, tid: string) {
  return db.approvalTemplate.findFirst({
    where: { id: tid, organizationId: orgId },
  });
}

/**
 * GET /api/organizations/[orgId]/approval-templates/[tid]
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Нет доступа к этой организации', 403);
    }

    const template = await db.approvalTemplate.findFirst({
      where: { id: params.tid, organizationId: params.orgId },
      include: {
        levels: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { level: 'asc' },
        },
      },
    });
    if (!template) return errorResponse('Шаблон не найден', 404);

    return successResponse(template);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения шаблона согласования');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/**
 * PATCH /api/organizations/[orgId]/approval-templates/[tid]
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Нет доступа к этой организации', 403);
    }

    const template = await findTemplate(params.orgId, params.tid);
    if (!template) return errorResponse('Шаблон не найден', 404);

    const body = await req.json();
    const parsed = updateTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.approvalTemplate.update({
      where: { id: params.tid },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      },
      include: {
        levels: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { level: 'asc' },
        },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления шаблона согласования');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/**
 * DELETE /api/organizations/[orgId]/approval-templates/[tid]
 * Cascade удаляет уровни (настроено в Prisma).
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Нет доступа к этой организации', 403);
    }

    const template = await findTemplate(params.orgId, params.tid);
    if (!template) return errorResponse('Шаблон не найден', 404);

    await db.approvalTemplate.delete({ where: { id: params.tid } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления шаблона согласования');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
