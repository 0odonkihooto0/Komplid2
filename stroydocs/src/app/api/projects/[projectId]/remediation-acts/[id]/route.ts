import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { invalidateAnalyticsCache } from '@/lib/analytics/cache';

export const dynamic = 'force-dynamic';

interface Params { projectId: string; id: string }

const REMEDIATION_ACT_DETAIL_INCLUDE = {
  issuedBy: { select: { id: true, firstName: true, lastName: true } },
  prescription: { select: { id: true, number: true, type: true, status: true } },
  inspection: { select: { id: true, number: true, status: true } },
  approvalRoute: true,
} as const;

// GET /api/projects/[projectId]/remediation-acts/[id] — детальная карточка
export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId, id } = params;

    const act = await db.defectRemediationAct.findFirst({
      where: { id, inspection: { projectId, buildingObject: { organizationId: orgId } } },
      include: REMEDIATION_ACT_DETAIL_INCLUDE,
    });
    if (!act) return errorResponse('Акт устранения не найден', 404);

    // Подгружаем дефекты по массиву defectIds
    const defects = await db.defect.findMany({
      where: { id: { in: act.defectIds } },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse({ ...act, defects });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения акта устранения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const updateRemediationActSchema = z.object({
  remediationDetails: z.record(z.string(), z.unknown()).optional(),
  defectIds: z.array(z.string()).optional(),
  // Перевод в статус «На рассмотрении» — отправка акта на проверку
  status: z.enum(['PENDING_REVIEW']).optional(),
});

// PATCH /api/projects/[projectId]/remediation-acts/[id] — обновить акт устранения
export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId, id } = params;

    const existing = await db.defectRemediationAct.findFirst({
      where: { id, inspection: { projectId, buildingObject: { organizationId: orgId } } },
      select: { id: true, status: true },
    });
    if (!existing) return errorResponse('Акт устранения не найден', 404);
    if (existing.status !== 'DRAFT') {
      return errorResponse('Можно редактировать только черновик', 400);
    }

    const body: unknown = await req.json();
    const parsed = updateRemediationActSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { remediationDetails, ...rest } = parsed.data;

    const updated = await db.defectRemediationAct.update({
      where: { id },
      data: {
        ...rest,
        ...(remediationDetails ? { remediationDetails: remediationDetails as Prisma.InputJsonValue } : {}),
      },
      include: REMEDIATION_ACT_DETAIL_INCLUDE,
    });

    await invalidateAnalyticsCache(projectId, orgId);

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления акта устранения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
