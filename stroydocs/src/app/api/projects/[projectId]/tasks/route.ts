import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;

const taskCreateSchema = z.object({
  title:       z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  priority:    z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  deadline:    z.string().datetime({ offset: true }).optional(),
  assigneeId:  z.string().uuid().optional(),
  contractId:  z.string().uuid().optional(),
  sourceType:  z.enum(['MANUAL', 'DEFECT', 'COMMENT']).default('MANUAL'),
});

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

    // Опциональный фильтр по статусу
    const rawStatus = req.nextUrl.searchParams.get('status');
    const status = rawStatus && (VALID_STATUSES as readonly string[]).includes(rawStatus)
      ? (rawStatus as typeof VALID_STATUSES[number])
      : undefined;

    const tasks = await db.task.findMany({
      where: {
        projectId: params.projectId,
        ...(status && { status }),
      },
      include: {
        assignee:  { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
    });

    return successResponse(tasks);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения задач');
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
    const parsed = taskCreateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { deadline, ...rest } = parsed.data;
    const task = await db.task.create({
      data: {
        ...rest,
        projectId:   params.projectId,
        createdById: session.user.id,
        ...(deadline && { deadline: new Date(deadline) }),
      },
      include: {
        assignee:  { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(task);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания задачи');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
