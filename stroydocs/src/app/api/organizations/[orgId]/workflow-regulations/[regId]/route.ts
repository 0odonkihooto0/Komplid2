import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { ParticipantRole } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { requireSystemAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

const stepSchema = z.object({
  role: z.nativeEnum(ParticipantRole),
  userId: z.string().uuid().optional(),
});

const updateRegulationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  stepsTemplate: z.array(stepSchema).min(1).optional(),
});

interface Params { params: { orgId: string; regId: string } }

/** GET — карточка регламента */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Недостаточно прав', 403);
    }

    const regulation = await db.workflowRegulation.findFirst({
      where: { id: params.regId, organizationId: params.orgId },
    });
    if (!regulation) return errorResponse('Регламент не найден', 404);

    return successResponse(regulation);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения регламента');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** PUT — обновить регламент (только ADMIN) */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Недостаточно прав', 403);
    }
    requireSystemAdmin(session);

    const regulation = await db.workflowRegulation.findFirst({
      where: { id: params.regId, organizationId: params.orgId },
    });
    if (!regulation) return errorResponse('Регламент не найден', 404);

    const body = await req.json();
    const parsed = updateRegulationSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const updated = await db.workflowRegulation.update({
      where: { id: params.regId },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        ...(parsed.data.stepsTemplate !== undefined ? { stepsTemplate: parsed.data.stepsTemplate } : {}),
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления регламента');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** DELETE — удалить регламент (только ADMIN, нет активных ДО) */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Недостаточно прав', 403);
    }
    requireSystemAdmin(session);

    const regulation = await db.workflowRegulation.findFirst({
      where: { id: params.regId, organizationId: params.orgId },
    });
    if (!regulation) return errorResponse('Регламент не найден', 404);

    // Запрещаем удаление если есть активные ДО по этому регламенту
    const activeWorkflow = await db.sEDWorkflow.findFirst({
      where: {
        regulationId: params.regId,
        status: { in: ['CREATED', 'IN_PROGRESS'] },
      },
    });
    if (activeWorkflow) {
      return errorResponse('Нельзя удалить регламент: есть активные карточки ДО', 409);
    }

    await db.workflowRegulation.delete({ where: { id: params.regId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления регламента');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
