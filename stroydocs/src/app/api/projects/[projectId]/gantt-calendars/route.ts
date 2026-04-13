import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const workDaysSchema = z.object({
  mon: z.boolean(),
  tue: z.boolean(),
  wed: z.boolean(),
  thu: z.boolean(),
  fri: z.boolean(),
  sat: z.boolean(),
  sun: z.boolean(),
});

const createCalendarSchema = z.object({
  name: z.string().min(1).max(200),
  isTemplate: z.boolean().optional().default(false),
  workDays: workDaysSchema,
  workHoursPerDay: z.number().min(0.5).max(24).optional().default(8),
  holidays: z.array(z.string()).optional().default([]),
  versionId: z.string().uuid().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const isTemplateParam = req.nextUrl.searchParams.get('isTemplate');
    const versionIdParam = req.nextUrl.searchParams.get('versionId');

    const isTemplate =
      isTemplateParam === 'true' ? true : isTemplateParam === 'false' ? false : undefined;

    const calendars = await db.ganttCalendar.findMany({
      where: {
        projectId: params.projectId,
        ...(isTemplate !== undefined && { isTemplate }),
        ...(versionIdParam && { versionId: versionIdParam }),
      },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(calendars);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения производственных календарей');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = createCalendarSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Если передан versionId — проверяем принадлежность версии к объекту
    if (parsed.data.versionId) {
      const version = await db.ganttVersion.findFirst({
        where: { id: parsed.data.versionId, projectId: params.projectId },
      });
      if (!version) return errorResponse('Версия ГПР не найдена', 404);
    }

    const calendar = await db.ganttCalendar.create({
      data: {
        name: parsed.data.name,
        isTemplate: parsed.data.isTemplate,
        workDays: parsed.data.workDays,
        workHoursPerDay: parsed.data.workHoursPerDay,
        holidays: parsed.data.holidays,
        projectId: params.projectId,
        ...(parsed.data.versionId && { versionId: parsed.data.versionId }),
      },
    });

    return successResponse(calendar);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания производственного календаря');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
