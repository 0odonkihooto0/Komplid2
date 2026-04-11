import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { updateDesignDocSchema } from '@/lib/validations/design-doc';
import { getDownloadUrl } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';

const DOC_FULL_INCLUDE = {
  author: { select: { id: true, firstName: true, lastName: true } },
  responsibleOrg: { select: { id: true, name: true } },
  responsibleUser: { select: { id: true, firstName: true, lastName: true } },
  approvalRoute: {
    include: {
      steps: {
        orderBy: { stepIndex: 'asc' as const },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, position: true } },
        },
      },
    },
  },
  versions: {
    select: { id: true, number: true, version: true, createdAt: true },
    orderBy: { version: 'asc' as const },
  },
  parentDoc: { select: { id: true, number: true, version: true } },
  _count: { select: { comments: true, changes: true } },
} as const;

type Params = { params: { objectId: string; docId: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const doc = await db.designDocument.findFirst({
      where: {
        id: params.docId,
        projectId: params.objectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      include: DOC_FULL_INCLUDE,
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    // Генерируем pre-signed URL для текущего файла (TTL: 1 час)
    let downloadUrl: string | null = null;
    if (doc.currentS3Key) {
      downloadUrl = await getDownloadUrl(doc.currentS3Key);
    }

    // Количество связанных BIM-элементов (полиморфная связь через BimElementLink)
    const timLinksCount = await db.bimElementLink.count({
      where: { entityType: 'DESIGN_DOC', entityId: params.docId },
    });

    return successResponse({ ...doc, downloadUrl, timLinksCount });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения документа ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const doc = await db.designDocument.findFirst({
      where: {
        id: params.docId,
        projectId: params.objectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    const body = await req.json();
    const parsed = updateDesignDocSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.designDocument.update({
      where: { id: params.docId },
      data: parsed.data,
      include: DOC_FULL_INCLUDE,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления документа ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
