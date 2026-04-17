import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createTaskScheduleSchema } from '@/lib/validations/task';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get('templateId');

    const schedules = await db.taskSchedule.findMany({
      where: {
        template: { organizationId: orgId },
        ...(templateId ? { templateId } : {}),
      },
      include: {
        template: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(schedules);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-schedules] GET:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const body: unknown = await req.json();
    const parsed = createTaskScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { templateId, startDate, endDate, ...rest } = parsed.data;

    const template = await db.taskTemplate.findFirst({
      where: { id: templateId, organizationId: orgId },
    });
    if (!template) return errorResponse('Шаблон не найден', 404);

    const schedule = await db.taskSchedule.create({
      data: {
        ...rest,
        templateId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    return successResponse(schedule);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-schedules] POST:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}
