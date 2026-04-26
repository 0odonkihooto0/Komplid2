import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { updateProjectSchema } from '@/lib/validations/project';
import { updateProjectPolicySchema } from '@/lib/validations/project-member';
import { successResponse, errorResponse } from '@/utils/api';
import { requirePermission } from '@/lib/permissions';
import { ACTIONS } from '@/lib/permissions/actions';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const objectWhere = session.user.activeWorkspaceId
      ? { id: params.projectId, OR: [{ workspaceId: session.user.activeWorkspaceId }, { organizationId: session.user.organizationId }] }
      : { id: params.projectId, organizationId: session.user.organizationId };

    const [project, currentStage, totalStages, gprProgressResult, budgetAggregate] = await Promise.all([
      db.buildingObject.findFirst({
        where: objectWhere,
        include: { _count: { select: { contracts: true } } },
      }),
      db.ganttStage.findFirst({
        where: { projectId: params.projectId, isCurrent: true },
        select: { id: true, name: true, order: true },
      }),
      db.ganttStage.count({ where: { projectId: params.projectId } }),
      db.ganttTask.aggregate({
        where: { isMilestone: false, version: { projectId: params.projectId, isActive: true } },
        _avg: { progress: true },
      }),
      db.fundingRecord.aggregate({
        where: { projectId: params.projectId, recordType: 'ALLOCATED' },
        _sum: { totalAmount: true },
      }),
    ]);

    if (!project) {
      return errorResponse('Проект не найден', 404);
    }

    const gprProgress = gprProgressResult._avg.progress;

    return successResponse({
      ...project,
      stage: currentStage ? { ...currentStage, total: totalStages } : null,
      gprProgress: gprProgress != null ? Math.round(gprProgress * 10) / 10 : null,
      budget: budgetAggregate._sum.totalAmount ?? null,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения проекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const body = await req.json();
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Проверка что проект принадлежит воркспейсу/организации
    const putWhere = session.user.activeWorkspaceId
      ? { id: params.projectId, OR: [{ workspaceId: session.user.activeWorkspaceId }, { organizationId: session.user.organizationId }] }
      : { id: params.projectId, organizationId: session.user.organizationId };
    const existing = await db.buildingObject.findFirst({
      where: putWhere,
      include: { _count: { select: { contracts: true } } },
    });
    if (!existing) {
      return errorResponse('Проект не найден', 404);
    }

    // Преобразуем строки дат в объекты Date для полей паспорта
    const { permitDate, plannedStartDate, plannedEndDate, actualStartDate, actualEndDate, ...rest } = parsed.data;
    const [project, currentStage, totalStages, gprProgressResult] = await Promise.all([
      db.buildingObject.update({
        where: { id: params.projectId },
        data: {
          ...rest,
          ...(permitDate !== undefined && { permitDate: permitDate ? new Date(permitDate) : null }),
          ...(plannedStartDate !== undefined && { plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null }),
          ...(plannedEndDate !== undefined && { plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null }),
          ...(actualStartDate !== undefined && { actualStartDate: actualStartDate ? new Date(actualStartDate) : null }),
          ...(actualEndDate !== undefined && { actualEndDate: actualEndDate ? new Date(actualEndDate) : null }),
        },
      }),
      db.ganttStage.findFirst({
        where: { projectId: params.projectId, isCurrent: true },
        select: { id: true, name: true, order: true },
      }),
      db.ganttStage.count({ where: { projectId: params.projectId } }),
      db.ganttTask.aggregate({
        where: { isMilestone: false, version: { projectId: params.projectId, isActive: true } },
        _avg: { progress: true },
      }),
    ]);

    const gprProgress = gprProgressResult._avg.progress;
    return successResponse({
      ...project,
      _count: existing._count,
      stage: currentStage ? { ...currentStage, total: totalStages } : null,
      gprProgress: gprProgress != null ? Math.round(gprProgress * 10) / 10 : null,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления проекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/**
 * PATCH — обновить политику доступа к проекту (memberPolicy).
 * Требует права PROJECT_MANAGE_MEMBERS (OWNER / ADMIN / MANAGER).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: session.user.activeWorkspaceId
        ? { id: params.projectId, OR: [{ workspaceId: session.user.activeWorkspaceId }, { organizationId: session.user.organizationId }] }
        : { id: params.projectId, organizationId: session.user.organizationId },
      select: { workspaceId: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    if (project.workspaceId) {
      await requirePermission(session.user.id, project.workspaceId, ACTIONS.PROJECT_MANAGE_MEMBERS);
    }

    const body: unknown = await req.json();
    const parsed = updateProjectPolicySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const updated = await db.buildingObject.update({
      where: { id: params.projectId },
      data: { memberPolicy: parsed.data.memberPolicy },
      select: { id: true, memberPolicy: true },
    });

    logger.info(
      { projectId: params.projectId, memberPolicy: parsed.data.memberPolicy, by: session.user.id },
      'project memberPolicy updated'
    );

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления политики доступа проекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
