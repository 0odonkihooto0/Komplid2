import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

interface Params { projectId: string }

const INSPECTION_ACT_INCLUDE = {
  issuedBy: { select: { id: true, firstName: true, lastName: true } },
  inspection: {
    select: {
      id: true,
      number: true,
      status: true,
      inspector: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} as const;

// GET /api/projects/[projectId]/inspection-acts — реестр актов проверки
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
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50')));
    const skip = (page - 1) * limit;

    const where = { inspection: { projectId } };

    const [acts, total] = await Promise.all([
      db.inspectionAct.findMany({
        where,
        include: INSPECTION_ACT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.inspectionAct.count({ where }),
    ]);

    return successResponse({ data: acts, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения актов проверки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
