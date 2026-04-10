import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const renameSchema = z.object({
  name: z.string().min(1, 'Введите название').max(200),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { objectId: string; folderId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const folder = await db.sEDFolder.findFirst({
      where: { id: params.folderId, projectId: params.objectId },
    });
    if (!folder) return errorResponse('Папка не найдена', 404);

    const body = await req.json();
    const parsed = renameSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const updated = await db.sEDFolder.update({
      where: { id: params.folderId },
      data: { name: parsed.data.name },
      include: { _count: { select: { documentLinks: true } } },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка переименования папки СЭД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { objectId: string; folderId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const folder = await db.sEDFolder.findFirst({
      where: { id: params.folderId, projectId: params.objectId },
    });
    if (!folder) return errorResponse('Папка не найдена', 404);

    await db.sEDFolder.delete({ where: { id: params.folderId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления папки СЭД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
