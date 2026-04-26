import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { requireProjectAccess } from '@/lib/permissions';
import { ACTIONS } from '@/lib/permissions/actions';
import { assignProjectMemberSchema } from '@/lib/validations/project-member';

export const dynamic = 'force-dynamic';

/**
 * GET — список членов проекта.
 * Для WORKSPACE_WIDE — возвращает всех активных членов workspace с флагом assigned.
 * Для ASSIGNED_ONLY — только явно назначенных.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Достаточно права просмотра проекта
    await requireProjectAccess(session.user.id, params.projectId, ACTIONS.PROJECT_VIEW);

    const project = await db.buildingObject.findUnique({
      where: { id: params.projectId },
      select: { memberPolicy: true, workspaceId: true },
    });
    if (!project || !project.workspaceId) return errorResponse('Объект не найден', 404);

    // Загружаем параллельно: назначенных + всех членов workspace
    const [assigned, wsMembers] = await Promise.all([
      db.projectMember.findMany({
        where: { projectId: params.projectId },
        include: {
          workspaceMember: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
        },
        orderBy: { assignedAt: 'asc' },
      }),
      db.workspaceMember.findMany({
        where: { workspaceId: project.workspaceId, status: 'ACTIVE' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { joinedAt: 'asc' },
      }),
    ]);

    const assignedWsMemberIds = new Set(assigned.map((a) => a.workspaceMemberId));

    return successResponse({
      policy: project.memberPolicy,
      assigned: assigned.map(mapAssigned),
      allWorkspaceMembers: wsMembers.map((m) => ({
        workspaceMemberId: m.id,
        role: m.role,
        specialization: m.specialization,
        title: m.title,
        isAssigned: assignedWsMemberIds.has(m.id),
        user: m.user,
      })),
    });
  } catch (err) {
    logger.error({ err }, 'GET /api/projects/[projectId]/members error');
    throw err;
  }
}

/**
 * POST — назначить члена на проект.
 * Требует права PROJECT_MANAGE_MEMBERS.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    await requireProjectAccess(
      session.user.id,
      params.projectId,
      ACTIONS.PROJECT_MANAGE_MEMBERS
    );

    const body: unknown = await req.json();
    const parsed = assignProjectMemberSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { workspaceMemberId, projectRole, notes } = parsed.data;

    // Проверяем что workspaceMember существует и принадлежит тому же workspace
    const project = await db.buildingObject.findUnique({
      where: { id: params.projectId },
      select: { workspaceId: true },
    });
    if (!project?.workspaceId) return errorResponse('Объект не найден', 404);

    const wsMember = await db.workspaceMember.findFirst({
      where: { id: workspaceMemberId, workspaceId: project.workspaceId, status: 'ACTIVE' },
    });
    if (!wsMember) return errorResponse('Член команды не найден в этом пространстве', 404);

    // Проверяем дублирование
    const existing = await db.projectMember.findUnique({
      where: {
        projectId_workspaceMemberId: {
          projectId: params.projectId,
          workspaceMemberId,
        },
      },
    });
    if (existing) return errorResponse('Этот участник уже назначен на объект', 409);

    const member = await db.projectMember.create({
      data: {
        projectId: params.projectId,
        workspaceMemberId,
        projectRole,
        assignedBy: session.user.id,
        notes: notes ?? null,
      },
      include: {
        workspaceMember: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    logger.info(
      { projectId: params.projectId, workspaceMemberId, projectRole, by: session.user.id },
      'project member assigned'
    );

    return successResponse(mapAssigned(member));
  } catch (err) {
    logger.error({ err }, 'POST /api/projects/[projectId]/members error');
    throw err;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAssigned(m: any) {
  return {
    id: m.id,
    projectId: m.projectId,
    workspaceMemberId: m.workspaceMemberId,
    projectRole: m.projectRole,
    assignedAt: m.assignedAt,
    notes: m.notes,
    workspaceRole: m.workspaceMember.role,
    specialization: m.workspaceMember.specialization,
    user: m.workspaceMember.user,
  };
}
