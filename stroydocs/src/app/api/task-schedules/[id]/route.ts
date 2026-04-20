import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { updateTaskScheduleSchema } from '@/lib/validations/task';

export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { id } = await params;

    const schedule = await db.taskSchedule.findFirst({
      where: { id, template: { organizationId: orgId } },
      include: { template: { select: { id: true, name: true, organizationId: true } } },
    });

    if (!schedule) return errorResponse('Расписание не найдено', 404);
    return successResponse(schedule);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-schedules/id] GET:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { id } = await params;

    const schedule = await db.taskSchedule.findFirst({
      where: { id, template: { organizationId: orgId } },
    });
    if (!schedule) return errorResponse('Расписание не найдено', 404);

    const body: unknown = await req.json();
    const parsed = updateTaskScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { startDate, endDate, ...rest } = parsed.data;

    const updated = await db.taskSchedule.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      },
    });

    return successResponse(updated);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-schedules/id] PATCH:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { id } = await params;

    const schedule = await db.taskSchedule.findFirst({
      where: { id, template: { organizationId: orgId } },
    });
    if (!schedule) return errorResponse('Расписание не найдено', 404);

    await db.taskSchedule.delete({ where: { id } });
    return successResponse({ id });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-schedules/id] DELETE:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}
