import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { canUserSeeTask } from '@/lib/task-visibility';
import { createChecklistItemSchema } from '@/lib/validations/task';

type Params = { params: Promise<{ id: string }> };

async function loadTaskForUser(taskId: string, userId: string, orgId: string) {
  const task = await db.task.findFirst({
    where: { id: taskId, project: { organizationId: orgId } },
    include: {
      roles: true,
      group: { select: { id: true, visibility: true, visibleUserIds: true } },
    },
  });
  if (!task || !canUserSeeTask(userId, task)) return null;
  return task;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const { id } = await params;

    const task = await loadTaskForUser(id, session.user.id, session.user.organizationId);
    if (!task) return errorResponse('Задача не найдена', 404);

    const items = await db.taskChecklistItem.findMany({
      where: { taskId: id },
      orderBy: { order: 'asc' },
    });

    return successResponse(items);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[tasks/checklist] GET:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const { id } = await params;

    const task = await loadTaskForUser(id, session.user.id, session.user.organizationId);
    if (!task) return errorResponse('Задача не найдена', 404);

    const body: unknown = await req.json();
    const parsed = (body as { reorder?: Array<{ id: string; order: number }> });
    if (!Array.isArray(parsed.reorder)) {
      return errorResponse('Некорректный формат запроса', 400);
    }

    await db.$transaction(
      parsed.reorder.map(({ id: itemId, order }) =>
        db.taskChecklistItem.updateMany({
          where: { id: itemId, taskId: id },
          data: { order },
        }),
      ),
    );

    return successResponse({ ok: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[tasks/checklist] PATCH:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const { id } = await params;

    const task = await loadTaskForUser(id, session.user.id, session.user.organizationId);
    if (!task) return errorResponse('Задача не найдена', 404);

    const body: unknown = await req.json();
    const parsed = createChecklistItemSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { title, s3Keys, order } = parsed.data;

    const autoOrder = order ?? (await db.taskChecklistItem.count({ where: { taskId: id } }));

    const item = await db.taskChecklistItem.create({
      data: { taskId: id, title, s3Keys, order: autoOrder },
    });

    return successResponse(item);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[tasks/checklist] POST:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}
