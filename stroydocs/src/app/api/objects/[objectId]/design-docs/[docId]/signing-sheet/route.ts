import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse } from '@/utils/api';
import {
  generatePIRSigningSheetPdf,
  type PIRSigningSheetPdfData,
  type PIRSigningParticipant,
} from '@/lib/pir-pdf-generator';
import { PARTICIPANT_ROLE_LABELS_RU } from '@/lib/xml/xml-utils';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; docId: string } };

const APPROVAL_ROUTE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'На согласовании',
  APPROVED: 'Согласовано',
  REJECTED: 'Отклонено',
  RESET: 'Сброшено',
};

/** POST — генерация PDF Листа подписания документа ПИР */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const doc = await db.designDocument.findFirst({
      where: {
        id: params.docId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      include: {
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

    // Для каждой роли ищем название организации
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

    const participants: PIRSigningParticipant[] = (doc.approvalRoute?.steps ?? []).map((s) => ({
      level: PARTICIPANT_ROLE_LABELS_RU[s.role] ?? s.role,
      name: s.user ? `${s.user.lastName} ${s.user.firstName}` : '—',
      position: s.user?.position ?? undefined,
      organization: orgByRole.get(s.role),
    }));

    const data: PIRSigningSheetPdfData = {
      docNumber: doc.number,
      docType: 'Документ ПИР',
      docDate: new Date(doc.createdAt).toLocaleDateString('ru-RU'),
      approvalStatus: doc.approvalRoute
        ? (APPROVAL_ROUTE_STATUS_LABELS[doc.approvalRoute.status] ?? doc.approvalRoute.status)
        : '—',
      participants,
      generatedAt: new Date().toLocaleString('ru-RU'),
    };

    const buffer = await generatePIRSigningSheetPdf(data);
    const filename = `signing-sheet-${doc.number.replace(/[^\w-]/g, '_')}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации листа подписания документа ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
