import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { markReadSchema } from '@/lib/validations/sed';

export const dynamic = 'force-dynamic';

// Массовое изменение статуса прочтения СЭД-документов
export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = markReadSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { documentIds, isRead } = parsed.data;

    // Обновляем только документы, принадлежащие этому объекту строительства
    const result = await db.sEDDocument.updateMany({
      where: {
        id: { in: documentIds },
        projectId: params.objectId,
      },
      data: {
        isRead,
        readAt: isRead ? new Date() : null,
      },
    });

    return successResponse({ updated: result.count });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления статуса прочтения СЭД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
