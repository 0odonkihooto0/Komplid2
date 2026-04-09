import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = {
  params: { objectId: string; contractId: string; versionId: string; chapterId: string };
};

async function resolveChapter(
  projectId: string,
  contractId: string,
  versionId: string,
  chapterId: string,
  orgId: string
) {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId: orgId },
  });
  if (!project) return null;

  return db.estimateChapter.findFirst({
    where: { id: chapterId, versionId, version: { contractId } },
  });
}

const patchChapterSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  code: z.string().max(20).nullable().optional(),
  order: z.number().int().min(0).optional(),
});

/** PATCH — переименовать / изменить порядок главы */
export async function PATCH(
  req: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSessionOrThrow();
    const chapter = await resolveChapter(
      params.objectId, params.contractId, params.versionId, params.chapterId, session.user.organizationId
    );
    if (!chapter) return errorResponse('Глава не найдена', 404);

    // Проверяем что версия не baseline
    const version = await db.estimateVersion.findUnique({
      where: { id: params.versionId },
      select: { isBaseline: true },
    });
    if (version?.isBaseline) {
      return errorResponse('Нельзя изменять базовую версию (Baseline)', 400);
    }

    const body = await req.json();
    const parsed = patchChapterSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const data = parsed.data;

    const updated = await db.estimateChapter.update({
      where: { id: params.chapterId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.code !== undefined && { code: data.code }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления главы сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** DELETE — удалить главу (cascade удалит позиции через Prisma) */
export async function DELETE(
  _req: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSessionOrThrow();
    const chapter = await resolveChapter(
      params.objectId, params.contractId, params.versionId, params.chapterId, session.user.organizationId
    );
    if (!chapter) return errorResponse('Глава не найдена', 404);

    const version = await db.estimateVersion.findUnique({
      where: { id: params.versionId },
      select: { isBaseline: true },
    });
    if (version?.isBaseline) {
      return errorResponse('Нельзя изменять базовую версию (Baseline)', 400);
    }

    await db.estimateChapter.delete({ where: { id: params.chapterId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления главы сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
