import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const updateDocumentSchema = z.object({
  name:             z.string().min(1).optional(),
  type:             z.string().optional(),
  number:           z.string().optional(),
  date:             z.string().nullable().optional(),
  status:           z.string().optional(),
  activeIssuesCount: z.number().int().min(0).optional(),
});

// Обновить документ мероприятия
export async function PUT(
  req: NextRequest,
  { params }: { params: { projectId: string; documentId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем принадлежность объекта к организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const document = await db.activityDocument.findFirst({
      where: { id: params.documentId, projectId: params.projectId },
    });
    if (!document) return errorResponse('Документ не найден', 404);

    const body = await req.json();
    const parsed = updateDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { date, ...rest } = parsed.data;

    const updated = await db.activityDocument.update({
      where: { id: params.documentId },
      data: {
        ...rest,
        ...(date !== undefined ? { date: date ? new Date(date) : null } : {}),
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления документа мероприятия');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Удалить документ мероприятия
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; documentId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const document = await db.activityDocument.findFirst({
      where: { id: params.documentId, projectId: params.projectId },
    });
    if (!document) return errorResponse('Документ не найден', 404);

    await db.activityDocument.delete({ where: { id: params.documentId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления документа мероприятия');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
