import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { invalidateAnalyticsCache } from '@/lib/analytics/cache';

interface Params { projectId: string; id: string }

const INSPECTION_DETAIL_INCLUDE = {
  inspector: { select: { id: true, firstName: true, lastName: true } },
  responsible: { select: { id: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  defects: {
    include: {
      author: { select: { id: true, firstName: true, lastName: true } },
      assignee: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  inspectionActs: {
    include: {
      issuedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  prescriptions: {
    include: {
      issuedBy: { select: { id: true, firstName: true, lastName: true } },
      responsible: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { defects: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  remediationActs: {
    include: {
      issuedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
} as const;

// GET /api/projects/[projectId]/inspections/[id] — карточка проверки
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId, id } = params;

    const inspection = await db.inspection.findFirst({
      where: { id, projectId, buildingObject: { organizationId: orgId } },
      include: INSPECTION_DETAIL_INCLUDE,
    });
    if (!inspection) return errorResponse('Проверка не найдена', 404);

    return successResponse(inspection);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения проверки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const updateInspectionSchema = z.object({
  comment: z.string().optional(),
  responsibleId: z.string().nullable().optional(),
  responsibleOrgId: z.string().nullable().optional(),
  contractorPresent: z.boolean().optional(),
  attentionUserId: z.string().nullable().optional(),
  ganttTaskIds: z.array(z.string()).optional(),
});

// PATCH /api/projects/[projectId]/inspections/[id] — обновить проверку
export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId, id } = params;

    const existing = await db.inspection.findFirst({
      where: { id, projectId, buildingObject: { organizationId: orgId } },
      select: { id: true, status: true },
    });
    if (!existing) return errorResponse('Проверка не найдена', 404);
    if (existing.status === 'COMPLETED') {
      return errorResponse('Нельзя редактировать завершённую проверку', 400);
    }

    const body: unknown = await req.json();
    const parsed = updateInspectionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.inspection.update({
      where: { id },
      data: parsed.data,
      include: INSPECTION_DETAIL_INCLUDE,
    });

    await invalidateAnalyticsCache(projectId, orgId);

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления проверки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
