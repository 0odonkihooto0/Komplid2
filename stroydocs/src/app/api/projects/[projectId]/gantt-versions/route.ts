import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const createVersionSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(200),
  stageId: z.string().uuid().optional(),
  description: z.string().max(1000).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const stageId = req.nextUrl.searchParams.get('stageId') ?? undefined;

    const versions = await db.ganttVersion.findMany({
      where: {
        projectId: params.projectId,
        ...(stageId ? { stageId } : {}),
      },
      include: {
        stage: { select: { id: true, name: true } },
        // Минимальный набор полей задач для вычисления агрегатов
        tasks: {
          select: { planStart: true, planEnd: true, amount: true, progress: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Вычисляем агрегаты из задач и возвращаем без сырого массива задач
    const result = versions.map(({ tasks, ...version }) => {
      const taskCount = tasks.length;
      const planStart =
        taskCount > 0
          ? new Date(Math.min(...tasks.map((t) => t.planStart.getTime())))
          : null;
      const planEnd =
        taskCount > 0
          ? new Date(Math.max(...tasks.map((t) => t.planEnd.getTime())))
          : null;
      const totalAmount = tasks.reduce((acc, t) => acc + (t.amount ?? 0), 0);
      const avgProgress =
        taskCount > 0
          ? tasks.reduce((acc, t) => acc + t.progress, 0) / taskCount
          : 0;

      return {
        ...version,
        taskCount,
        planStart,
        planEnd,
        totalAmount,
        progress: Math.round(avgProgress),
      };
    });

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения версий ГПР');
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
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = createVersionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Если указана стадия — проверяем что она принадлежит этому объекту
    if (parsed.data.stageId) {
      const stage = await db.ganttStage.findFirst({
        where: { id: parsed.data.stageId, projectId: params.projectId },
      });
      if (!stage) return errorResponse('Стадия не найдена', 404);
    }

    const version = await db.ganttVersion.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        stageId: parsed.data.stageId ?? null,
        projectId: params.projectId,
        isDirective: false,
        isActive: true,
        isBaseline: false,
        createdById: session.user.id,
      },
      include: {
        stage: { select: { id: true, name: true } },
      },
    });

    return successResponse({ ...version, taskCount: 0, planStart: null, planEnd: null, totalAmount: 0, progress: 0 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания версии ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
