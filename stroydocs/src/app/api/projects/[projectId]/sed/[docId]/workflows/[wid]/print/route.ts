import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse } from '@/utils/api';
import {
  generateApprovalSheetPdf,
  type ApprovalSheetPdfData,
} from '@/lib/sed-workflow-pdf-generator';

export const dynamic = 'force-dynamic';

// Человекочитаемые метки типов ДО
const WORKFLOW_TYPE_LABELS: Record<string, string> = {
  APPROVAL: 'Согласование',
  MULTI_APPROVAL: 'Многостороннее согласование',
  MULTI_SIGNING: 'Многостороннее подписание',
  DELEGATION: 'Делегирование',
  REDIRECT: 'Перенаправление',
  REVIEW: 'Ознакомление',
  DIGITAL_SIGNING: 'Подписание ЭП',
};

// Человекочитаемые метки статусов шагов
const STEP_STATUS_LABELS: Record<string, string> = {
  WAITING: 'Ожидает решения',
  APPROVED: 'Согласовано',
  REJECTED: 'Отклонено',
};

interface Params { params: { projectId: string; docId: string; wid: string } }

/** POST — генерация PDF листа согласования карточки ДО */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const workflow = await db.sEDWorkflow.findFirst({
      where: { id: params.wid, documentId: params.docId },
      include: {
        document: { select: { id: true, title: true, number: true } },
        initiator: {
          select: { firstName: true, lastName: true, position: true },
        },
        approvalRoute: {
          include: {
            steps: {
              orderBy: { stepIndex: 'asc' },
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    position: true,
                    organization: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!workflow) return errorResponse('Карточка ДО не найдена', 404);

    const locale = 'ru-RU';
    const dateOpts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const actionLabel = WORKFLOW_TYPE_LABELS[workflow.workflowType] ?? workflow.workflowType;

    const data: ApprovalSheetPdfData = {
      workflowNumber: workflow.number,
      workflowType: actionLabel,
      documentTitle: workflow.document.title,
      documentNumber: workflow.document.number,
      initiatorName: `${workflow.initiator.lastName} ${workflow.initiator.firstName}`,
      authorPosition: workflow.initiator.position ?? undefined,
      createdAt: workflow.createdAt.toLocaleDateString(locale, dateOpts),
      completedAt: workflow.completedAt
        ? workflow.completedAt.toLocaleDateString(locale, dateOpts)
        : undefined,
      steps: (workflow.approvalRoute?.steps ?? []).map((step, idx) => ({
        stepNumber: idx + 1,
        participantName: step.user
          ? `${step.user.lastName} ${step.user.firstName}`
          : '—',
        position: step.user?.position ?? undefined,
        organization: step.user?.organization?.name ?? undefined,
        action: actionLabel,
        status: STEP_STATUS_LABELS[step.status] ?? step.status,
        comment: step.comment ?? undefined,
        decidedAt: step.decidedAt
          ? step.decidedAt.toLocaleDateString(locale, dateOpts)
          : undefined,
      })),
      generatedAt: new Date().toLocaleDateString(locale, dateOpts),
    };

    const buffer = await generateApprovalSheetPdf(data);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="approval-sheet-${workflow.number}.pdf"`,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации PDF листа согласования ДО');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
