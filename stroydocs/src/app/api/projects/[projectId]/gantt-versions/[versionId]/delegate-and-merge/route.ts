import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { recalcSummaryTasks } from '@/lib/gantt/recalc-summary';

export const dynamic = 'force-dynamic';

const delegateAndMergeSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1).max(200),
  targetVersionId: z.string().uuid(),
  mergedName: z.string().min(1).max(500).optional(),
});

/**
 * Делегирование задач с укрупнением: группирует выбранные задачи
 * в одну суммарную задачу в целевой версии.
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
    const parsed = delegateAndMergeSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { taskIds, targetVersionId, mergedName } = parsed.data;

    // Проверка целевой версии
    const targetVersion = await db.ganttVersion.findFirst({
      where: { id: targetVersionId, projectId: params.projectId },
    });
    if (!targetVersion) return errorResponse('Целевая версия не найдена', 404);
    if (targetVersion.id === params.versionId) {
      return errorResponse('Нельзя делегировать в ту же версию', 400);
    }

    // Проверка задач
    const sourceTaskMap = new Map(sourceVersion.tasks.map((t) => [t.id, t]));
    for (const id of taskIds) {
      const task = sourceTaskMap.get(id);
      if (!task) return errorResponse(`Задача ${id} не найдена в версии`, 404);
      if (task.delegatedToVersionId) {
        return errorResponse(`Задача «${task.name}» уже делегирована`, 409);
      }
    }

    // Собрать все задачи для копирования (выбранные + дочерние рекурсивно)
    const tasksToCopy = collectSubtrees(taskIds, sourceVersion.tasks);
    const topLevelIdSet = new Set(taskIds);

    // Вычислить агрегированные даты для суммарной задачи
    const topLevelTasks = taskIds.map((id) => sourceTaskMap.get(id)!);
    const mergedPlanStart = new Date(
      Math.min(...topLevelTasks.map((t) => t.planStart.getTime()))
    );
    const mergedPlanEnd = new Date(
      Math.max(...topLevelTasks.map((t) => t.planEnd.getTime()))
    );

    const result = await db.$transaction(async (tx) => {
      // Определить максимальный sortOrder в целевой версии
      const lastTarget = await tx.ganttTask.findFirst({
        where: { versionId: targetVersionId },
        orderBy: { sortOrder: 'desc' },
      });
      const baseSortOrder = (lastTarget?.sortOrder ?? -1) + 1;

      // Создать суммарную задачу-контейнер
      const mergedParent = await tx.ganttTask.create({
        data: {
          name: mergedName ?? `Делегировано из «${sourceVersion.name}»`,
          versionId: targetVersionId,
          parentId: null,
          sortOrder: baseSortOrder,
          level: 0,
          status: 'NOT_STARTED',
          planStart: mergedPlanStart,
          planEnd: mergedPlanEnd,
          progress: 0,
          isCritical: false,
          isMilestone: false,
        },
      });

      // Копировать задачи как дочерние суммарной задачи
      const idMap = new Map<string, string>();
      const sorted = [...tasksToCopy].sort((a, b) => a.sortOrder - b.sortOrder);

      for (const [idx, task] of Array.from(sorted.entries())) {
        // Верхнеуровневые задачи → дочерние mergedParent
        // Остальные → ремаппинг parentId через idMap
        let newParentId: string | null;
        if (topLevelIdSet.has(task.id)) {
          newParentId = mergedParent.id;
        } else {
          newParentId = task.parentId ? (idMap.get(task.parentId) ?? null) : null;
        }

        // Сдвиг level: верхнеуровневые → 1, их дочерние → +1 от оригинала
        const newLevel = topLevelIdSet.has(task.id)
          ? 1
          : task.level + 1;

        const created = await tx.ganttTask.create({
          data: {
            name: task.name,
            versionId: targetVersionId,
            parentId: newParentId,
            sourceTaskId: task.id,
            sortOrder: baseSortOrder + 1 + idx,
            level: newLevel,
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

      // Пометить исходные задачи как делегированные
      for (const taskId of taskIds) {
        await tx.ganttTask.update({
          where: { id: taskId },
          data: { delegatedToVersionId: targetVersionId },
        });
      }

      // Пересчитать суммарные задачи обеих версий
      await recalcSummaryTasks(tx, params.versionId);
      await recalcSummaryTasks(tx, targetVersionId);

      return {
        mergedTaskId: mergedParent.id,
        delegatedCount: tasksToCopy.length,
        targetVersionId,
        mapping: Object.fromEntries(idMap),
      };
    });

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка делегирования с укрупнением задач ГПР');
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
