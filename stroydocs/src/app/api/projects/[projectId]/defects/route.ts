import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { invalidateAnalyticsCache } from '@/lib/analytics/cache';
import { getDefectCategoryRefId } from '@/lib/references/ref-mapper';

export const dynamic = 'force-dynamic';

interface Params { projectId: string }

const DEFECT_INCLUDE = {
  author: { select: { id: true, firstName: true, lastName: true } },
  assignee: { select: { id: true, firstName: true, lastName: true } },
  contract: { select: { id: true, number: true, name: true } },
  _count: { select: { comments: true } },
} as const;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId } = params;

    // Проверяем доступ
    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const url = new URL(req.url);
    const status = url.searchParams.get('status') ?? undefined;
    const category = url.searchParams.get('category') ?? undefined;
    const contractId = url.searchParams.get('contractId') ?? undefined;
    const assigneeId = url.searchParams.get('assigneeId') ?? undefined;
    const overdueOnly = url.searchParams.get('overdueOnly') === 'true';

    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50')));
    const skip = (page - 1) * limit;

    const now = new Date();

    const where = {
      projectId,
      ...(status ? { status: status as never } : {}),
      ...(category ? { category: category as never } : {}),
      ...(contractId ? { contractId } : {}),
      ...(assigneeId ? { assigneeId } : {}),
      ...(overdueOnly ? { deadline: { lt: now }, status: { in: ['OPEN', 'IN_PROGRESS'] as never[] } } : {}),
    };

    const [defects, total] = await Promise.all([
      db.defect.findMany({
        where,
        include: DEFECT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.defect.count({ where }),
    ]);

    return successResponse({ data: defects, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения дефектов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const createDefectSchema = z.object({
  title:        z.string().min(1, 'Введите название дефекта'),
  description:  z.string().optional(),
  category:     z.enum(['QUALITY_VIOLATION', 'TECHNOLOGY_VIOLATION', 'FIRE_SAFETY', 'ECOLOGY', 'DOCUMENTATION', 'OTHER']).default('OTHER'),
  contractId:   z.string().optional(),
  normativeRef: z.string().optional(),
  assigneeId:   z.string().optional(),
  deadline:     z.string().datetime().optional(),
  gpsLat:       z.number().optional(),
  gpsLng:       z.number().optional(),
});

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
    const parsed = createDefectSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { deadline, ...rest } = parsed.data;
    const categoryRefId = await getDefectCategoryRefId(rest.category);

    const defect = await db.defect.create({
      data: {
        ...rest,
        projectId,
        authorId: session.user.id,
        ...(deadline ? { deadline: new Date(deadline) } : {}),
        ...(categoryRefId ? { categoryRefId } : {}),
      },
      include: DEFECT_INCLUDE,
    });

    await invalidateAnalyticsCache(projectId, orgId);

    return successResponse(defect);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания дефекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
