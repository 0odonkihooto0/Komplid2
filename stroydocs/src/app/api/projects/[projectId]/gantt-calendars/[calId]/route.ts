import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateCalendarSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  isTemplate: z.boolean().optional(),
  workDays: z
    .object({
      mon: z.boolean(),
      tue: z.boolean(),
      wed: z.boolean(),
      thu: z.boolean(),
      fri: z.boolean(),
      sat: z.boolean(),
      sun: z.boolean(),
    })
    .optional(),
  workHoursPerDay: z.number().min(0.5).max(24).optional(),
  holidays: z.array(z.string()).optional(),
  versionId: z.string().uuid().nullable().optional(),
  taskId: z.string().uuid().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; calId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности календаря к объекту организации
    const calendar = await db.ganttCalendar.findFirst({
      where: {
        id: params.calId,
        projectId: params.projectId,
        project: { organizationId: session.user.organizationId },
      },
    });
    if (!calendar) return errorResponse('Календарь не найден', 404);

    const body = await req.json();
    const parsed = updateCalendarSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.ganttCalendar.update({
      where: { id: params.calId },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.isTemplate !== undefined && { isTemplate: parsed.data.isTemplate }),
        ...(parsed.data.workDays !== undefined && { workDays: parsed.data.workDays }),
        ...(parsed.data.workHoursPerDay !== undefined && {
          workHoursPerDay: parsed.data.workHoursPerDay,
        }),
        ...(parsed.data.holidays !== undefined && { holidays: parsed.data.holidays }),
        ...(parsed.data.versionId !== undefined && { versionId: parsed.data.versionId }),
        ...(parsed.data.taskId !== undefined && { taskId: parsed.data.taskId }),
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления производственного календаря');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; calId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const calendar = await db.ganttCalendar.findFirst({
      where: {
        id: params.calId,
        projectId: params.projectId,
        project: { organizationId: session.user.organizationId },
      },
    });
    if (!calendar) return errorResponse('Календарь не найден', 404);

    await db.ganttCalendar.delete({ where: { id: params.calId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления производственного календаря');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
