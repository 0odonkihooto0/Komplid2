import type { PrismaClient } from '@prisma/client';
import type { ParseResult } from './parsers/types';
import { recalcSummaryTasks } from './recalc-summary';
import { logger } from '@/lib/logger';

type PrismaTx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

interface ImportResult {
  taskCount: number;
  depCount: number;
  warnings: string[];
}

/**
 * Записывает распарсенные данные из внешнего файла (XER, MSP XML, Excel)
 * в версию ГПР как набор GanttTask + GanttDependency.
 *
 * Вызывается внутри транзакции Prisma — не управляет транзакцией сам.
 */
export async function importFromParsedFile(
  tx: PrismaTx,
  versionId: string,
  parsed: ParseResult,
  options?: { withVat?: boolean },
): Promise<ImportResult> {
  const warnings = [...parsed.warnings];
  const withVat = options?.withVat ?? false;

  logger.info(
    { versionId, taskCount: parsed.tasks.length, depCount: parsed.dependencies.length },
    'Импорт задач ГПР из распарсенного файла',
  );

  // Маппинг externalId → id созданной задачи в БД
  const idMap = new Map<string, string>();
  let taskCount = 0;

  for (const [sortOrder, pt] of Array.from(parsed.tasks.entries())) {
    // Разрешаем parentId через маппинг
    let parentId: string | null = null;
    if (pt.parentExternalId) {
      parentId = idMap.get(pt.parentExternalId) ?? null;
      if (!parentId) {
        warnings.push(
          `Задача "${pt.name}" (${pt.externalId}): родитель ${pt.parentExternalId} не найден, задача станет корневой`,
        );
      }
    }

    // Определяем статус по прогрессу
    let status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' = 'NOT_STARTED';
    if (pt.progress >= 100) {
      status = 'COMPLETED';
    } else if (pt.progress > 0) {
      status = 'IN_PROGRESS';
    }

    // Валидация дат: если planEnd < planStart — меняем местами
    let planStart = pt.planStart;
    let planEnd = pt.planEnd;
    if (planEnd < planStart) {
      warnings.push(
        `Задача "${pt.name}" (${pt.externalId}): planEnd < planStart, даты переставлены`,
      );
      [planStart, planEnd] = [planEnd, planStart];
    }

    // Стоимость: unitCost * volume или totalCost напрямую
    const amount = pt.totalCost ?? null;
    const amountVat = withVat && amount !== null ? Math.round(amount * 0.2 * 100) / 100 : null;

    const task = await tx.ganttTask.create({
      data: {
        name: pt.name,
        versionId,
        sortOrder,
        level: pt.level,
        planStart,
        planEnd,
        factStart: pt.factStart ?? null,
        factEnd: pt.factEnd ?? null,
        progress: Math.min(Math.max(pt.progress, 0), 100),
        status,
        isCritical: false,
        isMilestone: pt.isMilestone ?? false,
        parentId,
        volume: pt.volume ?? null,
        volumeUnit: pt.volumeUnit ?? null,
        amount,
        amountVat,
        linkedExecutionDocsCount: 0,
      },
    });

    idMap.set(pt.externalId, task.id);
    taskCount++;
  }

  // Создание зависимостей
  let depCount = 0;

  for (const dep of parsed.dependencies) {
    const predecessorId = idMap.get(dep.predecessorExternalId);
    const successorId = idMap.get(dep.successorExternalId);

    if (!predecessorId || !successorId) {
      warnings.push(
        `Зависимость ${dep.predecessorExternalId} → ${dep.successorExternalId}: одна из задач не найдена, пропущена`,
      );
      continue;
    }

    // Пропускаем самоссылки
    if (predecessorId === successorId) {
      warnings.push(
        `Зависимость ${dep.predecessorExternalId} → ${dep.successorExternalId}: самоссылка, пропущена`,
      );
      continue;
    }

    await tx.ganttDependency.create({
      data: {
        predecessorId,
        successorId,
        type: dep.type,
        lagDays: Math.round(dep.lagDays),
      },
    });
    depCount++;
  }

  // Пересчёт суммарных задач (агрегация дат, прогресса, стоимости)
  await recalcSummaryTasks(tx, versionId);

  logger.info(
    { versionId, taskCount, depCount, warningCount: warnings.length },
    'Импорт задач ГПР завершён',
  );

  return { taskCount, depCount, warnings };
}
