import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

interface Params { params: { projectId: string; docId: string; wid: string } }

/** GET — карточка ДО с полными данными маршрута */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const workflow = await db.sEDWorkflow.findFirst({
      where: { id: params.wid, documentId: params.docId },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            number: true,
            status: true,
            docType: true,
          },
        },
        initiator: { select: { id: true, firstName: true, lastName: true, position: true } },
        regulation: { select: { id: true, name: true, description: true } },
        approvalRoute: {
          include: {
            steps: {
              orderBy: { stepIndex: 'asc' },
              include: {
                user: { select: { id: true, firstName: true, lastName: true, position: true } },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
          include: {
            author: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        bases: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!workflow) return errorResponse('Карточка ДО не найдена', 404);

    return successResponse(workflow);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения карточки ДО');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
