import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateVersionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  stageId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
});

async function getVersionOrError(
  versionId: string,
  projectId: string,
  organizationId: string
) {
  return db.ganttVersion.findFirst({
    where: {
      id: versionId,
      projectId,
      project: { organizationId },
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; versionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const version = await getVersionOrError(
      params.versionId,
      params.projectId,
      session.user.organizationId
    );
    if (!version) return errorResponse('Версия ГПР не найдена', 404);

    const body = await req.json();
    const parsed = updateVersionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Если меняется стадия — проверяем что она принадлежит этому объекту
    if (parsed.data.stageId) {
      const stage = await db.ganttStage.findFirst({
        where: { id: parsed.data.stageId, projectId: params.projectId },
      });
      if (!stage) return errorResponse('Стадия не найдена', 404);
    }

    const updated = await db.ganttVersion.update({
      where: { id: params.versionId },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.stageId !== undefined && { stageId: parsed.data.stageId }),
        ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
      },
      include: {
        stage: { select: { id: true, name: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления версии ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; versionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const version = await getVersionOrError(
      params.versionId,
      params.projectId,
      session.user.organizationId
    );
    if (!version) return errorResponse('Версия ГПР не найдена', 404);

    // Нельзя удалять директивную версию
    if (version.isDirective) {
      return errorResponse('Нельзя удалить директивную версию ГПР', 409);
    }

    await db.ganttVersion.delete({ where: { id: params.versionId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления версии ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
