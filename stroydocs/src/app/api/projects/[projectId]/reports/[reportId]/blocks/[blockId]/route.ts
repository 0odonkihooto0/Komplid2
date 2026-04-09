import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

interface Params { projectId: string; reportId: string; blockId: string }

/** Получить блок с проверкой доступа */
async function getBlockOrNull(blockId: string, reportId: string, projectId: string, orgId: string) {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId: orgId },
    select: { id: true },
  });
  if (!project) return null;

  return db.reportBlock.findFirst({
    where: { id: blockId, reportId, report: { projectId } },
  });
}

const updateBlockSchema = z.object({
  title: z.string().min(1).optional(),
  order: z.number().int().min(0).optional(),
  content: z.record(z.string(), z.unknown()).nullable().optional(),
});

/** PATCH /api/projects/[projectId]/reports/[reportId]/blocks/[blockId] — обновить блок */
export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId, reportId, blockId } = params;

    const block = await getBlockOrNull(blockId, reportId, projectId, orgId);
    if (!block) return errorResponse('Блок не найден', 404);

    const body: unknown = await req.json();
    const parsed = updateBlockSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { title, order, content } = parsed.data;

    const updated = await db.reportBlock.update({
      where: { id: blockId },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(order !== undefined ? { order } : {}),
        // При ручном изменении content сбрасываем флаг автозаполнения
        ...(content !== undefined ? {
          content: content === null ? Prisma.JsonNull : content as Prisma.InputJsonValue,
          isAutoFilled: false,
        } : {}),
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления блока отчёта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** DELETE /api/projects/[projectId]/reports/[reportId]/blocks/[blockId] — удалить блок */
export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId, reportId, blockId } = params;

    const block = await getBlockOrNull(blockId, reportId, projectId, orgId);
    if (!block) return errorResponse('Блок не найден', 404);

    await db.reportBlock.delete({ where: { id: blockId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления блока отчёта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
