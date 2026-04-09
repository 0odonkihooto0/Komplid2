import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const storageActionSchema = z.object({
  action: z.enum(['ACTIVATE', 'DEACTIVATE']),
});

type Params = { params: { projectId: string; journalId: string } };

/** POST .../storage — переключение режима хранения (ГОСТ Р 70108-2025) */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const journal = await db.specialJournal.findFirst({
      where: { id: params.journalId, projectId: params.projectId },
      select: { id: true, status: true },
    });
    if (!journal) return errorResponse('Журнал не найден', 404);

    // Закрытый журнал нельзя переводить в другой статус
    if (journal.status === 'CLOSED') {
      return errorResponse('Закрытый журнал нельзя перевести в другой статус', 400);
    }

    const body = await req.json();
    const parsed = storageActionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { action } = parsed.data;
    const targetStatus = action === 'DEACTIVATE' ? 'STORAGE' : 'ACTIVE';

    if (journal.status === targetStatus) {
      return errorResponse(`Журнал уже в статусе ${targetStatus}`, 409);
    }

    const updated = await db.specialJournal.update({
      where: { id: params.journalId },
      data: {
        status: targetStatus,
        closedAt: action === 'DEACTIVATE' ? new Date() : null,
      },
      include: {
        responsible: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { entries: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка переключения режима хранения журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
