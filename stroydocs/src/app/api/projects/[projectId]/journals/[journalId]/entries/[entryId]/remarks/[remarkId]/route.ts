import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { updateRemarkSchema } from '@/lib/validations/journal-schemas';

export const dynamic = 'force-dynamic';

type Params = {
  params: { projectId: string; journalId: string; entryId: string; remarkId: string };
};

/** PATCH .../remarks/[remarkId] — обновить замечание */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Проверка цепочки: замечание → запись → журнал → проект
    const remark = await db.journalEntryRemark.findFirst({
      where: { id: params.remarkId, entryId: params.entryId },
      include: {
        entry: {
          include: { journal: { select: { projectId: true } } },
        },
      },
    });
    if (!remark || !remark.entry || remark.entry.journal.projectId !== params.projectId) {
      return errorResponse('Замечание не найдено', 404);
    }

    const body = await req.json();
    const parsed = updateRemarkSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { text, status, resolution, deadline } = parsed.data;

    // При переходе в RESOLVED — фиксируем время и автора
    const resolveData =
      status === 'RESOLVED' && remark.status !== 'RESOLVED'
        ? { resolvedAt: new Date(), resolvedById: session.user.id }
        : {};

    // При переходе из RESOLVED — очищаем данные разрешения
    const unresolveData =
      status && status !== 'RESOLVED' && remark.status === 'RESOLVED'
        ? { resolvedAt: null, resolvedById: null }
        : {};

    const updated = await db.journalEntryRemark.update({
      where: { id: params.remarkId },
      data: {
        ...(text !== undefined ? { text } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(resolution !== undefined ? { resolution } : {}),
        ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
        ...resolveData,
        ...unresolveData,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления замечания');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** DELETE .../remarks/[remarkId] — удалить замечание */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Проверка цепочки
    const remark = await db.journalEntryRemark.findFirst({
      where: { id: params.remarkId, entryId: params.entryId },
      include: {
        entry: {
          include: { journal: { select: { projectId: true } } },
        },
      },
    });
    if (!remark || !remark.entry || remark.entry.journal.projectId !== params.projectId) {
      return errorResponse('Замечание не найдено', 404);
    }

    if (remark.status !== 'OPEN') {
      return errorResponse('Можно удалить только замечание в статусе OPEN', 400);
    }

    await db.journalEntryRemark.delete({ where: { id: params.remarkId } });

    return successResponse({ id: params.remarkId });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления замечания');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
