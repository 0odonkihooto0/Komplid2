import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { recalcSummaryTasks } from '@/lib/gantt/recalc-summary';

export const dynamic = 'force-dynamic';

const delegateSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1).max(200),
  targetVersionId: z.string().uuid(),
});

/**
 * Делегирование задач из текущей версии ГПР в целевую.
 * Копирует выбранные задачи (с подзадачами) в целевую версию,
 * помечает исходные задачи как делегированные.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; versionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const sourceVersion = await db.ganttVersion.findFirst({
      where: { id: params.versionId, projectId: params.projectId },
      include: { tasks: true },
    });
    if (!sourceVersion) return errorResponse('Версия ГПР не найдена', 404);

    const body = await req.json();
    const parsed = delegateSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { taskIds, targetVersionId } = parsed.data;

    // Проверка: целевая версия существует и принадлежит тому же проекту
    const targetVersion = await db.ganttVersion.findFirst({
      where: { id: targetVersionId, projectId: params.projectId },
    });
    if (!targetVersion) return errorResponse('Целевая версия не найдена', 404);
    if (targetVersion.id === params.versionId) {
      return errorResponse('Нельзя делегировать в ту же версию', 400);
    }

    // Проверка: все задачи принадлежат исходной версии и не делегированы
    const sourceTaskMap = new Map(sourceVersion.tasks.map((t) => [t.id, t]));
    for (const id of taskIds) {
      const task = sourceTaskMap.get(id);
      if (!task) return errorResponse(`Задача ${id} не найдена в версии`, 404);
      if (task.delegatedToVersionId) {
        return errorResponse(`Задача «${task.name}» уже делегирована`, 409);
      }
    }

    // Собрать полный набор задач для копирования: выбранные + все дочерние (рекурсивно)
    const tasksToCopy = collectSubtrees(taskIds, sourceVersion.tasks);

    const result = await db.$transaction(async (tx) => {
      // Определить максимальный sortOrder в целевой версии
      const lastTarget = await tx.ganttTask.findFirst({
        where: { versionId: targetVersionId },
        orderBy: { sortOrder: 'desc' },
      });
      const baseSortOrder = (lastTarget?.sortOrder ?? -1) + 1;

      // Копируем задачи с ремаппингом parentId
      const idMap = new Map<string, string>();
      const sorted = [...tasksToCopy].sort((a, b) => a.sortOrder - b.sortOrder);

      for (const [idx, task] of Array.from(sorted.entries())) {
        const created = await tx.ganttTask.create({
          data: {
            name: task.name,
            versionId: targetVersionId,
            parentId: task.parentId ? (idMap.get(task.parentId) ?? null) : null,
            sourceTaskId: task.id,
            sortOrder: baseSortOrder + idx,
            level: task.level,
            status: task.status,
            planStart: task.planStart,
            planEnd: task.planEnd,
            progress: 0,
            isCritical: task.isCritical,
            isMilestone: task.isMilestone,
            directiveStart: task.directiveStart,
            directiveEnd: task.directiveEnd,
            volume: task.volume,
            volumeUnit: task.volumeUnit,
            amount: task.amount,
            manHours: task.manHours,
            machineHours: task.machineHours,
            amountVat: task.amountVat,
            costType: task.costType,
            workType: task.workType,
            basis: task.basis,
            materialDistribution: task.materialDistribution,
            weight: task.weight,
            calendarType: task.calendarType,
            workItemId: task.workItemId,
            estimateItemId: task.estimateItemId,
            linkedExecutionDocsCount: 0,
          },
        });
        idMap.set(task.id, created.id);
      }

      // Пометить исходные задачи (только выбранные, не дочерние) как делегированные
      await tx.ganttTask.updateMany({
        where: { id: { in: taskIds } },
        data: { delegatedToVersionId: targetVersionId },
      });

      // Пересчитать суммарные задачи обеих версий
      await recalcSummaryTasks(tx, params.versionId);
      await recalcSummaryTasks(tx, targetVersionId);

      return {
        delegatedCount: tasksToCopy.length,
        targetVersionId,
        mapping: Object.fromEntries(idMap),
      };
    });

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка делегирования задач ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** Собрать задачи + все дочерние рекурсивно, с дедупликацией */
function collectSubtrees<T extends { id: string; parentId: string | null }>(
  rootIds: string[],
  allTasks: T[]
): T[] {
  const collected = new Set<string>();
  const childrenMap = new Map<string, T[]>();

  for (const t of allTasks) {
    if (t.parentId) {
      if (!childrenMap.has(t.parentId)) childrenMap.set(t.parentId, []);
      childrenMap.get(t.parentId)!.push(t);
    }
  }

  function collect(id: string) {
    if (collected.has(id)) return;
    collected.add(id);
    const children = childrenMap.get(id) ?? [];
    for (const child of children) {
      collect(child.id);
    }
  }

  for (const id of rootIds) collect(id);

  return allTasks.filter((t) => collected.has(t.id));
}
