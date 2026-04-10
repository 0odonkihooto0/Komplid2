import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createSEDFolderSchema } from '@/lib/validations/sed';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Загружаем дерево папок — только корневые, с детьми
    const folders = await db.sEDFolder.findMany({
      where: { projectId: params.projectId, parentId: null },
      include: {
        children: {
          include: {
            _count: { select: { documentLinks: true } },
          },
          orderBy: { order: 'asc' },
        },
        _count: { select: { documentLinks: true } },
      },
      orderBy: { order: 'asc' },
    });

    return successResponse(folders);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения папок СЭД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createSEDFolderSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    // Если указан родитель — проверить что он принадлежит этому проекту
    if (parsed.data.parentId) {
      const parentFolder = await db.sEDFolder.findFirst({
        where: { id: parsed.data.parentId, projectId: params.projectId },
      });
      if (!parentFolder) return errorResponse('Родительская папка не найдена', 404);
    }

    const folder = await db.sEDFolder.create({
      data: {
        name: parsed.data.name,
        order: parsed.data.order ?? 0,
        projectId: params.projectId,
        parentId: parsed.data.parentId ?? null,
      },
      include: {
        _count: { select: { documentLinks: true } },
      },
    });

    return successResponse(folder);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания папки СЭД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
