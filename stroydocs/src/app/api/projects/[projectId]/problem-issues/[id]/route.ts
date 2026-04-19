import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { z } from 'zod';
import { ProblemIssueType, ProblemIssueStatus } from '@prisma/client';
import { getProblemIssueTypeRefId } from '@/lib/references/ref-mapper';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  type: z.nativeEnum(ProblemIssueType).optional(),
  status: z.nativeEnum(ProblemIssueStatus).optional(),
  description: z.string().min(1).max(2000).optional(),
  resolution: z.string().max(2000).optional(),
  responsible: z.string().max(200).optional(),
  deadline: z.string().datetime().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; id: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const issue = await db.problemIssue.findFirst({
      where: { id: params.id, projectId: params.projectId },
    });
    if (!issue) return errorResponse('Проблемный вопрос не найден', 404);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { deadline, status, ...rest } = parsed.data;
    const typeRefId = rest.type ? await getProblemIssueTypeRefId(rest.type) : undefined;

    // При закрытии — фиксируем дату закрытия
    const closedAt =
      status === 'CLOSED' && issue.status !== 'CLOSED' ? new Date() : undefined;

    const updated = await db.problemIssue.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(status !== undefined ? { status } : {}),
        ...(closedAt !== undefined ? { closedAt } : {}),
        ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
        ...(typeRefId !== undefined ? { typeRefId: typeRefId ?? null } : {}),
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления проблемного вопроса');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; id: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const issue = await db.problemIssue.findFirst({
      where: { id: params.id, projectId: params.projectId },
    });
    if (!issue) return errorResponse('Проблемный вопрос не найден', 404);

    await db.problemIssue.delete({ where: { id: params.id } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления проблемного вопроса');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
