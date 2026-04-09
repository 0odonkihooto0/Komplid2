import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  weather: z.string().max(50).optional(),
  temperature: z.number().int().min(-60).max(60).nullable().optional(),
  workersCount: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(2000).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; logId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const log = await db.dailyLog.findFirst({
      where: { id: params.logId, contractId: params.contractId },
    });
    if (!log) return errorResponse('Запись не найдена', 404);

    const body: unknown = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const updated = await db.dailyLog.update({
      where: { id: params.logId },
      data: parsed.data,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления ежедневного журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; logId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const log = await db.dailyLog.findFirst({
      where: { id: params.logId, contractId: params.contractId },
    });
    if (!log) return errorResponse('Запись не найдена', 404);

    await db.dailyLog.delete({ where: { id: params.logId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления ежедневного журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
