import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const fromTemplateSchema = z.object({
  templateId: z.string().uuid(),
  versionId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
});

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
    const parsed = fromTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Проверяем что шаблон принадлежит проекту и является шаблоном
    const template = await db.ganttCalendar.findFirst({
      where: { id: parsed.data.templateId, projectId: params.projectId, isTemplate: true },
    });
    if (!template) return errorResponse('Шаблон календаря не найден', 404);

    // Если передан versionId — проверяем принадлежность к проекту
    if (parsed.data.versionId) {
      const version = await db.ganttVersion.findFirst({
        where: { id: parsed.data.versionId, projectId: params.projectId },
      });
      if (!version) return errorResponse('Версия ГПР не найдена', 404);
    }

    // Если передан taskId — проверяем принадлежность задачи к проекту через версию
    if (parsed.data.taskId) {
      const task = await db.ganttTask.findFirst({
        where: {
          id: parsed.data.taskId,
          version: { projectId: params.projectId },
        },
      });
      if (!task) return errorResponse('Задача не найдена', 404);
    }

    const calendar = await db.ganttCalendar.create({
      data: {
        name: `${template.name} (копия)`,
        isTemplate: false,
        workDays: template.workDays as Prisma.InputJsonValue,
        workHoursPerDay: template.workHoursPerDay,
        holidays: template.holidays as Prisma.InputJsonValue,
        projectId: params.projectId,
        ...(parsed.data.versionId && { versionId: parsed.data.versionId }),
        ...(parsed.data.taskId && { taskId: parsed.data.taskId }),
      },
    });

    return successResponse(calendar);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания календаря из шаблона');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
