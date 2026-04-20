import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';
interface Params { projectId: string; id: string }

const INSPECTION_ACT_DETAIL_INCLUDE = {
  issuedBy: { select: { id: true, firstName: true, lastName: true } },
  inspection: {
    include: {
      inspector: { select: { id: true, firstName: true, lastName: true } },
      responsible: { select: { id: true, firstName: true, lastName: true } },
      defects: {
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' as const },
      },
    },
  },
  approvalRoute: true,
} as const;

// GET /api/projects/[projectId]/inspection-acts/[id] — карточка акта проверки
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { id } = params;

    const act = await db.inspectionAct.findFirst({
      where: { id, inspection: { buildingObject: { organizationId: orgId } } },
      include: INSPECTION_ACT_DETAIL_INCLUDE,
    });
    if (!act) return errorResponse('Акт проверки не найден', 404);

    return successResponse(act);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения акта проверки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
