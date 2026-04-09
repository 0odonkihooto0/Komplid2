import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateVersionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  stageId: z.string().uuid().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { objectId: string; versionId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации (multi-tenancy)
    const object = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    // Проверка что версия принадлежит данному объекту
    const existing = await db.ganttVersion.findFirst({
      where: { id: params.versionId, projectId: params.objectId },
    });
    if (!existing) return errorResponse('Версия ГПР не найдена', 404);

    const body: unknown = await req.json();
    const parsed = updateVersionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    // Формируем объект с только переданными полями (partial update)
    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.stageId !== undefined) data.stageId = parsed.data.stageId;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;

    const updated = await db.ganttVersion.update({
      where: { id: params.versionId },
      data,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления версии ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
