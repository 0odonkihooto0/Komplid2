import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { isSystemAdmin } from '@/lib/permissions';
import { successResponse, errorResponse } from '@/utils/api';
import { updateQuestionSchema } from '@/lib/validations/question';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { projectId: string; questionId: string } };

async function checkAccess(projectId: string, orgId: string): Promise<NextResponse | null> {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId: orgId },
    select: { id: true },
  });
  return project ? null : errorResponse('Проект не найден', 404);
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await getSessionOrThrow();
    const accessError = await checkAccess(params.projectId, session.user.organizationId);
    if (accessError) return accessError;

    const issue = await db.problemIssue.findFirst({
      where: { id: params.questionId, projectId: params.projectId },
      include: {
        author:      { select: { id: true, firstName: true, lastName: true } },
        assigneeOrg: { select: { id: true, name: true } },
        verifierOrg: { select: { id: true, name: true } },
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!issue) return errorResponse('Вопрос не найден', 404);

    return successResponse(issue);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения проблемного вопроса');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await getSessionOrThrow();
    const accessError = await checkAccess(params.projectId, session.user.organizationId);
    if (accessError) return accessError;

    const issue = await db.problemIssue.findFirst({
      where: { id: params.questionId, projectId: params.projectId },
      select: { id: true },
    });
    if (!issue) return errorResponse('Вопрос не найден', 404);

    const body = await req.json();
    const parsed = updateQuestionSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { resolutionDate, ...rest } = parsed.data;

    const updated = await db.problemIssue.update({
      where: { id: params.questionId },
      data: {
        ...rest,
        ...(resolutionDate !== undefined
          ? { resolutionDate: resolutionDate ? new Date(resolutionDate) : null }
          : {}),
      },
      include: {
        author:      { select: { id: true, firstName: true, lastName: true } },
        assigneeOrg: { select: { id: true, name: true } },
        verifierOrg: { select: { id: true, name: true } },
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления проблемного вопроса');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await getSessionOrThrow();
    const accessError = await checkAccess(params.projectId, session.user.organizationId);
    if (accessError) return accessError;

    const issue = await db.problemIssue.findFirst({
      where: { id: params.questionId, projectId: params.projectId },
      select: { id: true, authorId: true },
    });
    if (!issue) return errorResponse('Вопрос не найден', 404);

    // Удалять может только автор или ADMIN
    if (issue.authorId !== session.user.id && !isSystemAdmin(session)) {
      return errorResponse('Недостаточно прав', 403);
    }

    await db.problemIssue.delete({ where: { id: params.questionId } });
    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления проблемного вопроса');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
