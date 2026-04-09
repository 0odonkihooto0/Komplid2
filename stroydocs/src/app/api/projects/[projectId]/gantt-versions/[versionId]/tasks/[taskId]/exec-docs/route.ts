import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; versionId: string; taskId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const task = await db.ganttTask.findFirst({
      where: { id: params.taskId, versionId: params.versionId },
    });
    if (!task) return errorResponse('Задача не найдена', 404);

    const links = await db.ganttTaskExecDoc.findMany({
      where: { ganttTaskId: params.taskId },
      include: {
        execDoc: {
          select: {
            id: true,
            number: true,
            title: true,
            type: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(links.map((l) => l.execDoc));
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения ИД для задачи ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const linkSchema = z.object({
  execDocId: z.string().uuid(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; versionId: string; taskId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const task = await db.ganttTask.findFirst({
      where: { id: params.taskId, versionId: params.versionId },
    });
    if (!task) return errorResponse('Задача не найдена', 404);

    const body = await req.json();
    const parsed = linkSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    // Проверяем что ИД принадлежит тому же объекту строительства
    const execDoc = await db.executionDoc.findFirst({
      where: {
        id: parsed.data.execDocId,
        contract: { projectId: params.projectId },
      },
    });
    if (!execDoc) return errorResponse('Исполнительный документ не найден', 404);

    // Проверяем что связь ещё не существует
    const existing = await db.ganttTaskExecDoc.findFirst({
      where: { ganttTaskId: params.taskId, execDocId: parsed.data.execDocId },
    });
    if (existing) return errorResponse('Документ уже привязан', 409);

    await db.$transaction([
      db.ganttTaskExecDoc.create({
        data: {
          ganttTaskId: params.taskId,
          execDocId: parsed.data.execDocId,
          createdById: session.user.id,
        },
      }),
      db.ganttTask.update({
        where: { id: params.taskId },
        data: { linkedExecutionDocsCount: { increment: 1 } },
      }),
    ]);

    return successResponse({ ok: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка привязки ИД к задаче ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string; versionId: string; taskId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const { searchParams } = new URL(req.url);
    const execDocId = searchParams.get('execDocId');
    if (!execDocId) return errorResponse('Не указан execDocId', 400);

    const link = await db.ganttTaskExecDoc.findFirst({
      where: { ganttTaskId: params.taskId, execDocId },
    });
    if (!link) return errorResponse('Связь не найдена', 404);

    await db.$transaction([
      db.ganttTaskExecDoc.delete({
        where: { ganttTaskId_execDocId: { ganttTaskId: params.taskId, execDocId } },
      }),
      db.ganttTask.update({
        where: { id: params.taskId },
        data: { linkedExecutionDocsCount: { decrement: 1 } },
      }),
    ]);

    return successResponse({ ok: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка отвязки ИД от задачи ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
