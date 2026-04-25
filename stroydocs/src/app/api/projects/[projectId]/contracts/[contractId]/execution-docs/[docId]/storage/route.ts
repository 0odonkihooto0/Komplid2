import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { requireSystemAdmin } from '@/lib/permissions';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const storageActionSchema = z.object({
  action: z.enum(['ACTIVATE', 'DEACTIVATE']),
});

type Params = {
  params: { projectId: string; contractId: string; docId: string };
};

/** POST — переключение режима хранения ЭОЖР (ГОСТ Р 70108-2025) */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const doc = await db.executionDoc.findFirst({
      where: { id: params.docId, contractId: params.contractId },
      select: { id: true, type: true, status: true, storageMode: true },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    const body = await req.json();
    const parsed = storageActionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { action } = parsed.data;

    if (action === 'ACTIVATE') {
      // Режим хранения только для ОЖР (ЭОЖР)
      if (doc.type !== 'OZR') {
        return errorResponse('Режим хранения доступен только для ЭОЖР (ОЖР)', 400);
      }

      // Документ должен быть подписан
      if (doc.status !== 'SIGNED') {
        return errorResponse('Перевести в режим хранения можно только подписанный документ', 400);
      }

      if (doc.storageMode) {
        return errorResponse('Документ уже в режиме хранения', 409);
      }

      const updated = await db.executionDoc.update({
        where: { id: params.docId },
        data: {
          storageMode: true,
          storageModeAt: new Date(),
        },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { signatures: true, comments: true } },
        },
      });

      return successResponse(updated);
    }

    // DEACTIVATE — только для ADMIN
    if (action === 'DEACTIVATE') {
      requireSystemAdmin(session);

      if (!doc.storageMode) {
        return errorResponse('Документ не находится в режиме хранения', 409);
      }

      const updated = await db.executionDoc.update({
        where: { id: params.docId },
        data: {
          storageMode: false,
          storageModeAt: null,
        },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { signatures: true, comments: true } },
        },
      });

      return successResponse(updated);
    }

    return errorResponse('Неизвестное действие', 400);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка переключения режима хранения ИД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
