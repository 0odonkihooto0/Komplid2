import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; versionId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const version = await db.ganttVersion.findFirst({
      where: { id: params.versionId, projectId: params.projectId },
    });
    if (!version) return errorResponse('Версия не найдена', 404);

    const [tasks, dependencies] = await Promise.all([
      db.ganttTask.findMany({
        where: { versionId: params.versionId },
        include: {
          workItem: { select: { id: true, name: true, projectCipher: true } },
        },
        orderBy: { sortOrder: 'asc' },
      }),
      db.ganttDependency.findMany({
        where: { predecessor: { versionId: params.versionId } },
      }),
    ]);

    return successResponse({ tasks, dependencies });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения задач ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const createTaskSchema = z.object({
  name: z.string().min(1).max(500),
  planStart: z.string().datetime(),
  planEnd: z.string().datetime(),
  parentId: z.string().uuid().optional(),
  workItemId: z.string().uuid().optional(),
  level: z.number().int().min(0).optional().default(0),
  sortOrder: z.number().int().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; versionId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const version = await db.ganttVersion.findFirst({
      where: { id: params.versionId, projectId: params.projectId },
    });
    if (!version) return errorResponse('Версия не найдена', 404);

    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    // Вычислить sortOrder = max + 1 если не передан
    let sortOrder = parsed.data.sortOrder;
    if (sortOrder === undefined) {
      const last = await db.ganttTask.findFirst({
        where: { versionId: params.versionId },
        orderBy: { sortOrder: 'desc' },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const task = await db.ganttTask.create({
      data: {
        name: parsed.data.name,
        planStart: new Date(parsed.data.planStart),
        planEnd: new Date(parsed.data.planEnd),
        parentId: parsed.data.parentId,
        workItemId: parsed.data.workItemId,
        level: parsed.data.level,
        sortOrder,
        versionId: params.versionId,
      },
      include: {
        workItem: { select: { id: true, name: true, projectCipher: true } },
      },
    });

    return successResponse(task);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания задачи ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
