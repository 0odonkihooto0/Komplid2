import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { requireProjectAccess } from '@/lib/permissions';
import { ACTIONS } from '@/lib/permissions/actions';
import { updateProjectMemberSchema } from '@/lib/validations/project-member';

export const dynamic = 'force-dynamic';

/**
 * PATCH — изменить роль или заметки назначенного члена.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; memberId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    await requireProjectAccess(
      session.user.id,
      params.projectId,
      ACTIONS.PROJECT_MANAGE_MEMBERS
    );

    // Проверяем принадлежность projectMember к этому проекту + multi-tenancy
    const existing = await db.projectMember.findFirst({
      where: { id: params.memberId, projectId: params.projectId },
    });
    if (!existing) return errorResponse('Участник не найден', 404);

    const body: unknown = await req.json();
    const parsed = updateProjectMemberSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const updated = await db.projectMember.update({
      where: { id: params.memberId },
      data: {
        ...(parsed.data.projectRole !== undefined && { projectRole: parsed.data.projectRole }),
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
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
      { memberId: params.memberId, projectId: params.projectId, by: session.user.id },
      'project member updated'
    );

    return successResponse({
      id: updated.id,
      projectRole: updated.projectRole,
      notes: updated.notes,
      user: updated.workspaceMember.user,
    });
  } catch (err) {
    logger.error({ err }, 'PATCH /api/projects/[projectId]/members/[memberId] error');
    throw err;
  }
}

/**
 * DELETE — снять члена с проекта.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; memberId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    await requireProjectAccess(
      session.user.id,
      params.projectId,
      ACTIONS.PROJECT_MANAGE_MEMBERS
    );

    const existing = await db.projectMember.findFirst({
      where: { id: params.memberId, projectId: params.projectId },
    });
    if (!existing) return errorResponse('Участник не найден', 404);

    await db.projectMember.delete({ where: { id: params.memberId } });

    logger.info(
      { memberId: params.memberId, projectId: params.projectId, by: session.user.id },
      'project member removed'
    );

    return successResponse({ deleted: true });
  } catch (err) {
    logger.error({ err }, 'DELETE /api/projects/[projectId]/members/[memberId] error');
    throw err;
  }
}
