import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { invalidateAnalyticsCache } from '@/lib/analytics/cache';

interface Params { projectId: string; defectId: string }

const DEFECT_INCLUDE = {
  author:   { select: { id: true, firstName: true, lastName: true } },
  assignee: { select: { id: true, firstName: true, lastName: true } },
  contract: { select: { id: true, number: true, name: true } },
  comments: {
    include: { author: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

async function getDefectOrThrow(defectId: string, projectId: string, orgId: string) {
  const defect = await db.defect.findFirst({
    where: { id: defectId, projectId, buildingObject: { organizationId: orgId } },
    include: DEFECT_INCLUDE,
  });
  return defect;
}

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const defect = await getDefectOrThrow(params.defectId, params.projectId, session.user.organizationId);
    if (!defect) return errorResponse('Дефект не найден', 404);
    return successResponse(defect);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения дефекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const updateDefectSchema = z.object({
  title:        z.string().min(1).optional(),
  description:  z.string().optional(),
  category:     z.enum(['QUALITY_VIOLATION', 'TECHNOLOGY_VIOLATION', 'FIRE_SAFETY', 'ECOLOGY', 'DOCUMENTATION', 'OTHER']).optional(),
  contractId:   z.string().nullable().optional(),
  normativeRef: z.string().optional(),
  assigneeId:   z.string().nullable().optional(),
  deadline:     z.string().datetime().nullable().optional(),
  gpsLat:       z.number().nullable().optional(),
  gpsLng:       z.number().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const existing = await db.defect.findFirst({
      where: { id: params.defectId, projectId: params.projectId, buildingObject: { organizationId: orgId } },
      select: { id: true },
    });
    if (!existing) return errorResponse('Дефект не найден', 404);

    const body: unknown = await req.json();
    const parsed = updateDefectSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { deadline, ...rest } = parsed.data;

    const updated = await db.defect.update({
      where: { id: params.defectId },
      data: {
        ...rest,
        ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
      },
      include: DEFECT_INCLUDE,
    });

    await invalidateAnalyticsCache(params.projectId, orgId);

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления дефекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const existing = await db.defect.findFirst({
      where: { id: params.defectId, projectId: params.projectId, buildingObject: { organizationId: orgId } },
      select: { id: true },
    });
    if (!existing) return errorResponse('Дефект не найден', 404);

    await db.defect.delete({ where: { id: params.defectId } });
    await invalidateAnalyticsCache(params.projectId, orgId);

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления дефекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
