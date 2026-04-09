import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

interface Params { projectId: string }

const PRESCRIPTION_INCLUDE = {
  issuedBy: { select: { id: true, firstName: true, lastName: true } },
  responsible: { select: { id: true, firstName: true, lastName: true } },
  inspection: { select: { id: true, number: true } },
  _count: { select: { defects: true, remediationActs: true } },
} as const;

// GET /api/projects/[projectId]/prescriptions — реестр предписаний
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
    const type = url.searchParams.get('type') ?? undefined;

    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50')));
    const skip = (page - 1) * limit;

    const where = {
      inspection: { projectId },
      ...(status ? { status: status as never } : {}),
      ...(type ? { type: type as never } : {}),
    };

    const [prescriptions, total] = await Promise.all([
      db.prescription.findMany({
        where,
        include: PRESCRIPTION_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.prescription.count({ where }),
    ]);

    return successResponse({ data: prescriptions, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения предписаний');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
