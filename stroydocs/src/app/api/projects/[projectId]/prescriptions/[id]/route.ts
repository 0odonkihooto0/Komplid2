import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';
interface Params { projectId: string; id: string }

const PRESCRIPTION_DETAIL_INCLUDE = {
  issuedBy: { select: { id: true, firstName: true, lastName: true } },
  responsible: { select: { id: true, firstName: true, lastName: true } },
  inspection: {
    select: {
      id: true,
      number: true,
      status: true,
      inspector: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  defects: {
    include: {
      author: { select: { id: true, firstName: true, lastName: true } },
      assignee: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  remediationActs: {
    include: {
      issuedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  approvalRoute: true,
} as const;

// GET /api/projects/[projectId]/prescriptions/[id] — карточка предписания
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { id } = params;

    const prescription = await db.prescription.findFirst({
      where: { id, inspection: { buildingObject: { organizationId: orgId } } },
      include: PRESCRIPTION_DETAIL_INCLUDE,
    });
    if (!prescription) return errorResponse('Предписание не найдено', 404);

    // Найти акты устранения этого предписания, уже отправленные на проверку
    const pendingActs = await db.defectRemediationAct.findMany({
      where: { prescriptionId: prescription.id, status: 'PENDING_REVIEW' },
      select: { id: true, number: true, defectIds: true },
    });

    // Карта: defectId → первый pending-акт, куда он включён
    const pendingMap = new Map<string, { id: string; number: string }>();
    for (const act of pendingActs) {
      for (const did of act.defectIds) {
        if (!pendingMap.has(did)) pendingMap.set(did, { id: act.id, number: act.number });
      }
    }

    const enrichedDefects = prescription.defects.map((d) => ({
      ...d,
      pendingRemediationActId: pendingMap.get(d.id)?.id ?? null,
      pendingRemediationActNumber: pendingMap.get(d.id)?.number ?? null,
    }));

    return successResponse({ ...prescription, defects: enrichedDefects });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения предписания');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
