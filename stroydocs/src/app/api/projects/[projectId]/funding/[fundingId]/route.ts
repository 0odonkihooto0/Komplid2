import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateFundingSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  amount: z.number().positive().optional(),
  actualAmount: z.number().nonnegative().nullable().optional(),
  period: z.string().max(50).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; fundingId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const source = await db.fundingSource.findFirst({
      where: { id: params.fundingId, projectId: params.projectId },
      select: { id: true },
    });
    if (!source) return errorResponse('Источник финансирования не найден', 404);

    const body = await req.json();
    const parsed = updateFundingSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const updated = await db.fundingSource.update({
      where: { id: params.fundingId },
      data: parsed.data,
      include: { budgetType: { select: { id: true, name: true, code: true, color: true } } },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления источника финансирования');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; fundingId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности проекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверка существования источника финансирования
    const source = await db.fundingSource.findFirst({
      where: { id: params.fundingId, projectId: params.projectId },
      select: { id: true },
    });
    if (!source) return errorResponse('Источник финансирования не найден', 404);

    await db.fundingSource.delete({ where: { id: params.fundingId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления источника финансирования');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
