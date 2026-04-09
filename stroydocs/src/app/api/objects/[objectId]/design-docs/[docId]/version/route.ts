import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; docId: string } };

// POST — создать новую версию документа ПИР (parentDocId → docId)
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const original = await db.designDocument.findFirst({
      where: {
        id: params.docId,
        projectId: params.objectId,
        isDeleted: false,
        buildingObject: { organizationId: session.user.organizationId },
      },
    });
    if (!original) return errorResponse('Документ не найден', 404);

    // Определить максимальную версию в семействе документов
    const maxResult = await db.designDocument.aggregate({
      where: {
        OR: [
          { id: params.docId },
          { parentDocId: params.docId },
        ],
      },
      _max: { version: true },
    });
    const newVersion = (maxResult._max.version ?? 1) + 1;

    const newDoc = await db.designDocument.create({
      data: {
        number: `${original.number}-v${newVersion}`,
        name: original.name,
        docType: original.docType,
        category: original.category,
        version: newVersion,
        status: 'CREATED',
        parentDocId: params.docId,
        responsibleOrgId: original.responsibleOrgId,
        responsibleUserId: original.responsibleUserId,
        notes: original.notes,
        projectId: params.objectId,
        authorId: session.user.id,
        s3Keys: [],
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        parentDoc: { select: { id: true, number: true, version: true } },
      },
    });

    return successResponse(newDoc);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания новой версии документа ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
