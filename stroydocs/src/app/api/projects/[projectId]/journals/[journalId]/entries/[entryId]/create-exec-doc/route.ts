import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { classifyExecutionDoc } from '@/lib/id-classification';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; journalId: string; entryId: string } };

/** POST .../entries/[entryId]/create-exec-doc — создать АОСР из записи журнала */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const entry = await db.specialJournalEntry.findFirst({
      where: { id: params.entryId, journalId: params.journalId },
      include: {
        journal: {
          select: { projectId: true, status: true, contractId: true, type: true },
        },
      },
    });
    if (!entry) return errorResponse('Запись не найдена', 404);
    if (entry.journal.projectId !== params.projectId) {
      return errorResponse('Запись не найдена', 404);
    }

    // Режим хранения — запрещено
    if (entry.journal.status !== 'ACTIVE') {
      return errorResponse('Журнал в режиме хранения — создание ИД запрещено', 403);
    }

    // Для создания АОСР необходима привязка журнала к договору
    if (!entry.journal.contractId) {
      return errorResponse('Журнал не привязан к договору — невозможно создать АОСР', 400);
    }

    const contractId = entry.journal.contractId;

    // Автонумерация АОСР в рамках договора
    const count = await db.executionDoc.count({
      where: { contractId, type: 'AOSR' },
    });
    const number = `AOSR-${String(count + 1).padStart(3, '0')}`;

    // Заголовок из описания записи (усечение до 80 символов)
    const descriptionPreview = entry.description.length > 80
      ? `${entry.description.slice(0, 77)}...`
      : entry.description;
    const title = `АОСР — ${descriptionPreview}`;

    // Создаём АОСР и привязываем к записи журнала атомарно
    const doc = await db.executionDoc.create({
      data: {
        type: 'AOSR',
        number,
        title,
        contractId,
        createdById: session.user.id,
        idCategory: classifyExecutionDoc('AOSR'),
      },
      select: { id: true, number: true, title: true },
    });

    await db.specialJournalEntry.update({
      where: { id: params.entryId },
      data: { executionDocId: doc.id },
    });

    logger.info(
      { entryId: params.entryId, docId: doc.id, contractId },
      'Создан АОСР из записи журнала'
    );

    return successResponse({ id: doc.id, number: doc.number, title: doc.title, contractId });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания АОСР из записи журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
