import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { getNextSEDWorkflowNumber } from '@/lib/numbering';

export const dynamic = 'force-dynamic';

interface Params { params: { projectId: string; docId: string; wid: string } }

/**
 * POST — создать ДО на основании текущей карточки.
 * Создаёт новый SEDWorkflow и SEDDocumentBasis.
 * ApprovalRoute для нового ДО создаётся отдельным запросом к POST /workflows.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверяем что карточка-основание существует и принадлежит этому документу
    const basisWorkflow = await db.sEDWorkflow.findFirst({
      where: { id: params.wid, documentId: params.docId },
    });
    if (!basisWorkflow) return errorResponse('Карточка ДО-основание не найдена', 404);

    const number = await getNextSEDWorkflowNumber(params.projectId);

    const newWorkflow = await db.$transaction(async (tx) => {
      const wf = await tx.sEDWorkflow.create({
        data: {
          number,
          workflowType: 'APPROVAL',
          status: 'CREATED',
          documentId: params.docId,
          initiatorId: session.user.id,
          participants: [],
          observers: [],
        },
      });

      await tx.sEDDocumentBasis.create({
        data: {
          workflowId: wf.id,
          basisWorkflowId: params.wid,
        },
      });

      return wf;
    });

    return successResponse({ workflowId: newWorkflow.id });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания ДО на основании');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
