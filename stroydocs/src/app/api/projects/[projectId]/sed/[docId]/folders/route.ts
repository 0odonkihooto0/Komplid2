import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const addToFolderSchema = z.object({
  folderId: z.string().uuid('Укажите корректный ID папки'),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; docId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.sEDDocument.findFirst({
      where: { id: params.docId, projectId: params.projectId },
    });
    if (!doc) return errorResponse('СЭД-документ не найден', 404);

    const body = await req.json();
    const parsed = addToFolderSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    // Проверить что папка принадлежит тому же проекту
    const folder = await db.sEDFolder.findFirst({
      where: { id: parsed.data.folderId, projectId: params.projectId },
    });
    if (!folder) return errorResponse('Папка не найдена', 404);

    try {
      const link = await db.sEDDocumentFolder.create({
        data: {
          documentId: params.docId,
          folderId: parsed.data.folderId,
        },
      });
      return successResponse(link);
    } catch (err: unknown) {
      // Уникальное ограничение — документ уже в этой папке
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        return errorResponse('Документ уже находится в этой папке', 409);
      }
      throw err;
    }
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка добавления документа СЭД в папку');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
