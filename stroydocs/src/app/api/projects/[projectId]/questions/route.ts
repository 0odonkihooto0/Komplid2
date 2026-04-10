import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createQuestionSchema } from '@/lib/validations/question';
import { ProblemIssueStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const sp = req.nextUrl.searchParams;
    const statusParam = sp.get('status') as ProblemIssueStatus | null;
    const page  = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(sp.get('limit') ?? '50', 10)));
    const skip  = (page - 1) * limit;

    const where = {
      projectId: params.projectId,
      ...(statusParam && Object.values(ProblemIssueStatus).includes(statusParam)
        ? { status: statusParam }
        : {}),
    };

    const [data, total] = await Promise.all([
      db.problemIssue.findMany({
        where,
        include: {
          author:      { select: { id: true, firstName: true, lastName: true } },
          assigneeOrg: { select: { id: true, name: true } },
          verifierOrg: { select: { id: true, name: true } },
          _count:      { select: { attachments: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.problemIssue.count({ where }),
    ]);

    return successResponse({ data, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения проблемных вопросов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createQuestionSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { resolutionDate, ...rest } = parsed.data;

    const issue = await db.problemIssue.create({
      data: {
        ...rest,
        projectId: params.projectId,
        authorId: session.user.id,
        ...(resolutionDate ? { resolutionDate: new Date(resolutionDate) } : {}),
      },
      include: {
        author:      { select: { id: true, firstName: true, lastName: true } },
        assigneeOrg: { select: { id: true, name: true } },
        verifierOrg: { select: { id: true, name: true } },
        _count:      { select: { attachments: true } },
      },
    });

    return successResponse(issue);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания проблемного вопроса');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
