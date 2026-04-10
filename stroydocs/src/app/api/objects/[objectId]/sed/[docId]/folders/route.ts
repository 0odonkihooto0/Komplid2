import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const addToFolderSchema = z.object({
  folderId: z.string().uuid('Неверный ID папки'),
});

// Добавить документ в папку (DnD из таблицы в сайдбар)
export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string; docId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.sEDDocument.findFirst({
      where: { id: params.docId, projectId: params.objectId },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    const body = await req.json();
    const parsed = addToFolderSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const folder = await db.sEDFolder.findFirst({
      where: { id: parsed.data.folderId, projectId: params.objectId },
    });
    if (!folder) return errorResponse('Папка не найдена', 404);

    // upsert — идемпотентно (повторное перетаскивание не создаёт дубликат)
    await db.sEDDocumentFolder.upsert({
      where: {
        documentId_folderId: {
          documentId: params.docId,
          folderId: parsed.data.folderId,
        },
      },
      create: {
        documentId: params.docId,
        folderId: parsed.data.folderId,
      },
      update: {},
    });

    return successResponse({ linked: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка добавления документа в папку СЭД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
