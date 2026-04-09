import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { invalidateAnalyticsCache } from '@/lib/analytics/cache';

export const dynamic = 'force-dynamic';

interface Params { projectId: string; id: string }

const addDefectSchema = z.object({
  title: z.string().min(1, 'Введите название недостатка'),
  description: z.string().optional(),
  category: z.enum([
    'QUALITY_VIOLATION', 'TECHNOLOGY_VIOLATION', 'FIRE_SAFETY',
    'ECOLOGY', 'DOCUMENTATION', 'OTHER',
  ]).default('OTHER'),
  normativeRef: z.string().optional(),
  assigneeId: z.string().optional(),
  deadline: z.string().datetime().optional(),
  requiresSuspension: z.boolean().default(false),
  gpsLat: z.number().optional(),
  gpsLng: z.number().optional(),
});

// POST /api/projects/[projectId]/inspections/[id]/add-defect — добавить недостаток к проверке
export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId, id } = params;

    // Проверяем доступ к объекту
    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверяем что проверка активна
    const inspection = await db.inspection.findFirst({
      where: { id, projectId, buildingObject: { organizationId: orgId } },
      select: { id: true, status: true },
    });
    if (!inspection) return errorResponse('Проверка не найдена', 404);
    if (inspection.status === 'COMPLETED') {
      return errorResponse('Нельзя добавлять недостатки к завершённой проверке', 400);
    }

    const body: unknown = await req.json();
    const parsed = addDefectSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { deadline, ...rest } = parsed.data;

    const defect = await db.defect.create({
      data: {
        ...rest,
        projectId,
        inspectionId: id,
        authorId: session.user.id,
        ...(deadline ? { deadline: new Date(deadline) } : {}),
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await invalidateAnalyticsCache(projectId, orgId);

    return successResponse(defect);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка добавления недостатка к проверке');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
