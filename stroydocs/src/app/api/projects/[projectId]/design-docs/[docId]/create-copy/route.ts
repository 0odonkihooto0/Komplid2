import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { getNextDesignDocNumber } from '@/lib/numbering';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; docId: string } };

/**
 * POST /api/projects/[projectId]/design-docs/[docId]/create-copy
 * Создать независимую копию документа ПИР без связи версионирования.
 * parentDocId = null, замечания НЕ наследуются.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const original = await db.designDocument.findFirst({
      where: {
        id: params.docId,
        projectId: params.projectId,
        isDeleted: false,
        buildingObject: { organizationId: session.user.organizationId },
      },
    });
    if (!original) return errorResponse('Документ не найден', 404);

    const newNumber = await getNextDesignDocNumber(params.projectId);

    const copy = await db.designDocument.create({
      data: {
        number: newNumber,
        name: `Копия — ${original.name}`,
        docType: original.docType,
        category: original.category,
        version: 1,
        status: 'CREATED',
        parentDocId: null, // независимая копия, не версия
        responsibleOrgId: original.responsibleOrgId,
        responsibleUserId: original.responsibleUserId,
        notes: original.notes,
        projectId: params.projectId,
        authorId: session.user.id,
        s3Keys: [],
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(copy);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания копии документа ПИР (create-copy)');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
