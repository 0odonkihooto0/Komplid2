import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { getNextSEDNumber } from '@/lib/numbering';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; docId: string } };

/**
 * POST — создать СЭД-документ из карточки документа ПИР.
 * Создаёт самоадресованный (внутренний) документ типа OTHER,
 * затем добавляет полиморфную ссылку на DesignDocument.
 * Возвращает { sedDocId } для редиректа на новый документ.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем принадлежность документа ПИР к организации (multi-tenancy)
    const doc = await db.designDocument.findFirst({
      where: {
        id: params.docId,
        projectId: params.objectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true, number: true, name: true },
    });
    if (!doc) return errorResponse('Документ ПИР не найден', 404);

    const orgId = session.user.organizationId;

    // Автонумерация СЭД через advisory lock
    const sedNumber = await getNextSEDNumber(params.objectId);

    // Формируем заголовок из шифра и наименования документа
    const title = doc.number ? `${doc.number}. ${doc.name}` : doc.name;

    // Создаём СЭД-документ (внутренний, отправитель = получатель = своя организация)
    const sedDoc = await db.sEDDocument.create({
      data: {
        number: sedNumber,
        docType: 'OTHER',
        title,
        projectId: params.objectId,
        authorId: session.user.id,
        senderOrgId: orgId,
        // receiverOrgIds — массив ID получателей (поле String[])
        receiverOrgIds: [orgId],
        // receiverOrgId — явная FK-связь на основного получателя
        receiverOrgId: orgId,
      },
      select: { id: true },
    });

    // Добавляем полиморфную ссылку DesignDocument → SEDDocument
    await db.sEDLink.create({
      data: {
        documentId: sedDoc.id,
        entityType: 'DESIGN_DOC',
        entityId: doc.id,
      },
    });

    return successResponse({ sedDocId: sedDoc.id });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания СЭД-документа из ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
