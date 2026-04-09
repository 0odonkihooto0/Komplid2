import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; versionId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const version = await db.ganttVersion.findFirst({
      where: { id: params.versionId, contractId: params.contractId },
    });
    if (!version) return errorResponse('Версия не найдена', 404);

    const schema = z.object({
      name: z.string().min(1).max(200).optional(),
      isActive: z.boolean().optional(),
      isBaseline: z.boolean().optional(),
    });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const updated = await db.$transaction(async (tx) => {
      // При установке isActive = true снимаем с остальных
      if (parsed.data.isActive === true) {
        await tx.ganttVersion.updateMany({
          where: { contractId: params.contractId, isActive: true, id: { not: params.versionId } },
          data: { isActive: false },
        });
      }
      return tx.ganttVersion.update({
        where: { id: params.versionId },
        data: parsed.data,
      });
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления версии графика');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; versionId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const version = await db.ganttVersion.findFirst({
      where: { id: params.versionId, contractId: params.contractId },
    });
    if (!version) return errorResponse('Версия не найдена', 404);

    await db.ganttVersion.delete({ where: { id: params.versionId } });

    return successResponse({ ok: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления версии графика');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
