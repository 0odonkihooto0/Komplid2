import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });

    if (!project) {
      return errorResponse('Проект не найден', 404);
    }

    const milestones = await db.ganttTask.findMany({
      where: {
        isMilestone: true,
        version: { projectId: params.projectId, isActive: true },
      },
      select: {
        id: true,
        name: true,
        planStart: true,
        planEnd: true,
        directiveStart: true,
        directiveEnd: true,
        status: true,
        comment: true,
      },
      orderBy: { planStart: 'asc' },
    });

    return successResponse(milestones);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения вех');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
