import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { invalidateAnalyticsCache } from '@/lib/analytics/cache';

export const dynamic = 'force-dynamic';

interface Params { projectId: string }

const INSPECTION_INCLUDE = {
  inspector: { select: { id: true, firstName: true, lastName: true } },
  responsible: { select: { id: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { defects: true, prescriptions: true, inspectionActs: true } },
} as const;

// GET /api/projects/[projectId]/inspections — реестр проверок
export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId } = params;

    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const url = new URL(req.url);
    const status = url.searchParams.get('status') ?? undefined;

    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50')));
    const skip = (page - 1) * limit;

    const where = {
      projectId,
      ...(status ? { status: status as never } : {}),
    };

    const [inspections, total] = await Promise.all([
      db.inspection.findMany({
        where,
        include: INSPECTION_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.inspection.count({ where }),
    ]);

    return successResponse({ data: inspections, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения проверок');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const createInspectionSchema = z.object({
  number: z.string().min(1, 'Введите номер проверки'),
  comment: z.string().optional(),
  inspectorId: z.string().min(1, 'Укажите проверяющего'),
  inspectorOrgId: z.string().optional(),
  responsibleId: z.string().optional(),
  responsibleOrgId: z.string().optional(),
  contractorPresent: z.boolean().optional(),
  attentionUserId: z.string().optional(),
  ganttTaskIds: z.array(z.string()).optional(),
});

// POST /api/projects/[projectId]/inspections — создать проверку
export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId } = params;

    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body: unknown = await req.json();
    const parsed = createInspectionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const inspection = await db.inspection.create({
      data: {
        ...parsed.data,
        projectId,
        createdById: session.user.id,
      },
      include: INSPECTION_INCLUDE,
    });

    await invalidateAnalyticsCache(projectId, orgId);

    return successResponse(inspection);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания проверки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
