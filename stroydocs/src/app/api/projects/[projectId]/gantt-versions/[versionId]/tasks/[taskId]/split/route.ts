import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { GanttTask } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logGanttChange } from '@/lib/gantt/log-change';

export const dynamic = 'force-dynamic';

const splitTaskSchema = z
  .object({
    mode: z.enum(['SEQUENTIAL', 'PARALLEL']),
    splitBy: z.enum(['COUNT', 'DURATION']),
    count: z.number().int().min(2).max(50).optional(),
    daysPerBatch: z.number().int().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.splitBy === 'COUNT' && data.count === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['count'],
        message: 'count обязателен при splitBy=COUNT',
      });
    }
    if (data.splitBy === 'DURATION' && data.daysPerBatch === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['daysPerBatch'],
        message: 'daysPerBatch обязателен при splitBy=DURATION',
      });
    }
  });

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Вычисляет плановые даты i-й захватки (0-based) */
function computeSubtaskDates(
  task: GanttTask,
  mode: 'SEQUENTIAL' | 'PARALLEL',
  splitBy: 'COUNT' | 'DURATION',
  N: number,
  daysPerBatch: number | undefined,
  i: number,
): { planStart: Date; planEnd: Date } {
  if (mode === 'SEQUENTIAL') {
    if (splitBy === 'COUNT') {
      const segmentMs = (task.planEnd.getTime() - task.planStart.getTime()) / N;
      const start = new Date(task.planStart.getTime() + i * segmentMs);
      // Последняя захватка получает точную дату окончания, чтобы избежать погрешностей
      const end =
        i === N - 1
          ? task.planEnd
          : new Date(task.planStart.getTime() + (i + 1) * segmentMs);
      return { planStart: start, planEnd: end };
    } else {
      // DURATION: захватки по daysPerBatch дней, начало последовательное
      const batchMs = (daysPerBatch ?? 1) * MS_PER_DAY;
      const start = new Date(task.planStart.getTime() + i * batchMs);
      const end = new Date(Math.min(start.getTime() + batchMs, task.planEnd.getTime()));
      return { planStart: start, planEnd: end };
    }
  } else {
    // PARALLEL: все захватки идут одновременно
    if (splitBy === 'COUNT') {
      // Каждая захватка охватывает весь период родительской задачи
      return { planStart: task.planStart, planEnd: task.planEnd };
    } else {
      // DURATION: все захватки одновременно, длительность daysPerBatch
      const end = new Date(task.planStart.getTime() + (daysPerBatch ?? 1) * MS_PER_DAY);
      return { planStart: task.planStart, planEnd: end };
    }
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; versionId: string; taskId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Получение и проверка задачи
    const task = await db.ganttTask.findFirst({
      where: { id: params.taskId, versionId: params.versionId },
    });
    if (!task) return errorResponse('Задача не найдена', 404);

    // Нельзя разделить задачу-веху
    if (task.isMilestone) {
      return errorResponse('Нельзя разделить задачу-веху', 422);
    }

    // Нельзя разделить задачу с нулевой продолжительностью
    const totalDays = Math.round(
      (task.planEnd.getTime() - task.planStart.getTime()) / MS_PER_DAY,
    );
    if (totalDays < 1) {
      return errorResponse('Нельзя разделить задачу с нулевой продолжительностью', 422);
    }

    // Нельзя разделить задачу, у которой уже есть подзадачи
    const childCount = await db.ganttTask.count({ where: { parentId: params.taskId } });
    if (childCount > 0) {
      return errorResponse('Нельзя разделить задачу, у которой уже есть подзадачи', 409);
    }

    const body = await req.json();
    const parsed = splitTaskSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { mode, splitBy, count, daysPerBatch } = parsed.data;

    // Вычисляем количество захваток N
    let N: number;
    if (splitBy === 'COUNT') {
      N = count!;
    } else {
      N = Math.ceil(totalDays / (daysPerBatch ?? 1));
      if (N < 2) {
        return errorResponse(
          'daysPerBatch слишком велик для данной задачи — получилась бы только одна захватка',
          422,
        );
      }
    }

    // Выполняем всё в одной транзакции
    const result = await db.$transaction(async (tx) => {
      // Превращаем исходную задачу в суммарную (раздел)
      const updatedParent = await tx.ganttTask.update({
        where: { id: params.taskId },
        data: { level: 0, volume: null, amount: null },
      });

      // Определяем базовый sortOrder для подзадач
      const lastTask = await tx.ganttTask.findFirst({
        where: { versionId: params.versionId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      const baseSortOrder = lastTask?.sortOrder ?? 0;

      // Создаём N подзадач
      const children: GanttTask[] = [];
      for (let i = 0; i < N; i++) {
        const dates = computeSubtaskDates(task, mode, splitBy, N, daysPerBatch, i);
        const child = await tx.ganttTask.create({
          data: {
            name: `${task.name} (захватка ${i + 1})`,
            versionId: params.versionId,
            parentId: params.taskId,
            // Подзадачи всегда на уровне работ (level=1 если родитель был level=0)
            level: task.level === 0 ? 1 : task.level,
            sortOrder: baseSortOrder + (i + 1) * 10,
            planStart: dates.planStart,
            planEnd: dates.planEnd,
            progress: 0,
            volume: task.volume != null ? task.volume / N : null,
            volumeUnit: task.volumeUnit ?? null,
            amount: task.amount != null ? task.amount / N : null,
            isMilestone: false,
            status: 'NOT_STARTED',
            // Наследуем классификационные поля
            workItemId: task.workItemId ?? null,
            contractId: task.contractId ?? null,
            costType: task.costType ?? null,
          },
        });
        children.push(child);
      }

      return { parent: updatedParent, children };
    });

    // Логируем изменения (fire-and-forget)
    void logGanttChange({
      versionId: params.versionId,
      userId: session.user.id,
      action: 'UPDATE',
      taskId: params.taskId,
      fieldName: 'level',
      oldValue: String(task.level),
      newValue: '0',
    });
    for (const child of result.children) {
      void logGanttChange({
        versionId: params.versionId,
        userId: session.user.id,
        action: 'CREATE',
        taskId: child.id,
        newValue: child.name,
      });
    }

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка разделения задачи ГПР на захватки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
