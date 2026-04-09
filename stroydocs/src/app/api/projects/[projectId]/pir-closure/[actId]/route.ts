import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { updatePIRClosureSchema } from '@/lib/validations/pir-closure';

export const dynamic = 'force-dynamic';

const ACT_FULL_INCLUDE = {
  author: { select: { id: true, firstName: true, lastName: true } },
  items: { orderBy: { id: 'asc' as const } },
  approvalRoute: {
    include: {
      steps: {
        orderBy: { stepIndex: 'asc' as const },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  },
} as const;

type Params = { params: { projectId: string; actId: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const act = await db.pIRClosureAct.findFirst({
      where: {
        id: params.actId,
        projectId: params.projectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      include: ACT_FULL_INCLUDE,
    });
    if (!act) return errorResponse('Акт закрытия не найден', 404);

    return successResponse(act);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения акта закрытия ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const act = await db.pIRClosureAct.findFirst({
      where: {
        id: params.actId,
        projectId: params.projectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true },
    });
    if (!act) return errorResponse('Акт закрытия не найден', 404);

    const body = await req.json();
    const parsed = updatePIRClosureSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.pIRClosureAct.update({
      where: { id: params.actId },
      data: {
        ...parsed.data,
        periodStart: parsed.data.periodStart ? new Date(parsed.data.periodStart) : undefined,
        periodEnd: parsed.data.periodEnd ? new Date(parsed.data.periodEnd) : undefined,
      },
      include: ACT_FULL_INCLUDE,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления акта закрытия ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
