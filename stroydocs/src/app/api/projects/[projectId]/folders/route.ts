import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createProjectFolderSchema } from '@/lib/validations/project-document';

export const dynamic = 'force-dynamic';

// Получить дерево папок проекта
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Загружаем только корневые папки с двумя уровнями вложенности
    const folders = await db.projectFolder.findMany({
      where: { projectId: params.projectId, parentId: null },
      orderBy: [{ pinTop: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
      include: {
        children: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          include: {
            children: {
              orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            },
            _count: { select: { documents: true } },
          },
        },
        _count: { select: { documents: true } },
      },
    });

    return successResponse(folders);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения папок проекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Создать папку
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createProjectFolderSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { name, parentId, order } = parsed.data;

    // Проверить что родительская папка принадлежит этому проекту
    if (parentId) {
      const parent = await db.projectFolder.findFirst({
        where: { id: parentId, projectId: params.projectId },
      });
      if (!parent) return errorResponse('Родительская папка не найдена', 404);
    }

    const folder = await db.projectFolder.create({
      data: { name, parentId, order: order ?? 0, projectId: params.projectId },
    });

    return successResponse(folder);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания папки проекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
