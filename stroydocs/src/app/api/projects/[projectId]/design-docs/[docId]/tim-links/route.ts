import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; docId: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем принадлежность документа организации
    const doc = await db.designDocument.findFirst({
      where: {
        id: params.docId,
        projectId: params.projectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    // BimElementLink — полиморфная связь (entityType = 'DESIGN_DOC')
    const links = await db.bimElementLink.findMany({
      where: {
        entityType: 'DESIGN_DOC',
        entityId: params.docId,
        model: {
          projectId: params.projectId,
        },
      },
      include: {
        model: {
          select: { id: true, name: true, stage: true },
        },
        element: {
          select: { id: true, ifcGuid: true, name: true, ifcType: true, level: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse({ data: links, count: links.length });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения ТИМ-связей документа ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
