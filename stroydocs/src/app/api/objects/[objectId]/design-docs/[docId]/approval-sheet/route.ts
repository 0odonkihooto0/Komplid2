import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse } from '@/utils/api';
import {
  generatePIRApprovalSheetPdf,
  type PIRApprovalSheetPdfData,
  type PIRApprovalSheetStep,
} from '@/lib/pir-pdf-generator';
import { PARTICIPANT_ROLE_LABELS_RU } from '@/lib/xml/xml-utils';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; docId: string } };

const STEP_STATUS_LABELS: Record<string, string> = {
  WAITING: 'На рассмотрении',
  APPROVED: 'Согласовано',
  REJECTED: 'Отклонено',
};

/** POST — генерация PDF Листа согласования документа ПИР */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const doc = await db.designDocument.findFirst({
      where: {
        id: params.docId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      include: {
        author: { select: { firstName: true, lastName: true, position: true } },
        approvalRoute: {
          include: {
            steps: {
              orderBy: { stepIndex: 'asc' },
              include: {
                user: { select: { firstName: true, lastName: true, position: true } },
              },
            },
          },
        },
      },
    });
    if (!doc) return errorResponse('Документ ПИР не найден', 404);

    // Для каждой роли ищем название организации из участников контракта объекта
    const orgByRole = new Map<string, string>();
    if (doc.approvalRoute) {
      const roles = Array.from(new Set(doc.approvalRoute.steps.map((s) => s.role)));
      const participants = await db.contractParticipant.findMany({
        where: {
          role: { in: roles as ('DEVELOPER' | 'CONTRACTOR' | 'SUBCONTRACTOR' | 'SUPERVISION')[] },
          contract: { projectId: params.objectId },
        },
        select: { role: true, organization: { select: { name: true } } },
      });
      for (const p of participants) {
        if (!orgByRole.has(p.role) && p.organization?.name) {
          orgByRole.set(p.role, p.organization.name);
        }
      }
    }

    const steps: PIRApprovalSheetStep[] = (doc.approvalRoute?.steps ?? []).map((s, idx) => ({
      stepNumber: idx + 1,
      level: PARTICIPANT_ROLE_LABELS_RU[s.role] ?? s.role,
      participantName: s.user
        ? `${s.user.lastName} ${s.user.firstName}`
        : '—',
      organization: orgByRole.get(s.role),
      position: s.user?.position ?? undefined,
      status: STEP_STATUS_LABELS[s.status] ?? s.status,
      decidedAt: s.decidedAt
        ? new Date(s.decidedAt).toLocaleDateString('ru-RU')
        : undefined,
      comment: s.comment ?? undefined,
    }));

    const data: PIRApprovalSheetPdfData = {
      docNumber: doc.number,
      docType: 'Документ ПИР',
      docDate: new Date(doc.createdAt).toLocaleDateString('ru-RU'),
      authorName: `${doc.author.lastName} ${doc.author.firstName}`,
      authorPosition: doc.author.position ?? undefined,
      steps,
      generatedAt: new Date().toLocaleString('ru-RU'),
    };

    const buffer = await generatePIRApprovalSheetPdf(data);
    const filename = `approval-sheet-${doc.number.replace(/[^\w-]/g, '_')}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации листа согласования документа ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
