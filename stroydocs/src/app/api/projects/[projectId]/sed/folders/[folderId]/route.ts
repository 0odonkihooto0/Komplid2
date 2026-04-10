import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { updateSEDFolderSchema } from '@/lib/validations/sed';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; folderId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const folder = await db.sEDFolder.findFirst({
      where: { id: params.folderId, projectId: params.projectId },
    });
    if (!folder) return errorResponse('Папка не найдена', 404);

    const body = await req.json();
    const parsed = updateSEDFolderSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    // Если меняется родитель — проверить что новый parent существует, принадлежит проекту, и не является самой папкой
    if (parsed.data.parentId !== undefined && parsed.data.parentId !== null) {
      if (parsed.data.parentId === params.folderId) {
        return errorResponse('Папка не может быть родителем самой себя', 400);
      }
      const newParent = await db.sEDFolder.findFirst({
        where: { id: parsed.data.parentId, projectId: params.projectId },
      });
      if (!newParent) return errorResponse('Новая родительская папка не найдена', 404);
    }

    const updated = await db.sEDFolder.update({
      where: { id: params.folderId },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.order !== undefined && { order: parsed.data.order }),
        ...(parsed.data.parentId !== undefined && { parentId: parsed.data.parentId }),
      },
      include: {
        _count: { select: { documentLinks: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления папки СЭД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; folderId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const folder = await db.sEDFolder.findFirst({
      where: { id: params.folderId, projectId: params.projectId },
    });
    if (!folder) return errorResponse('Папка не найдена', 404);

    // Удалить папку (cascade удаляет SEDDocumentFolder — документы остаются)
    await db.sEDFolder.delete({ where: { id: params.folderId } });

    return successResponse({ id: params.folderId });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления папки СЭД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
