import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { calculateCriticalPath } from '@/lib/gantt/critical-path';

export const dynamic = 'force-dynamic';

// Схема валидации query-параметров
const querySchema = z.object({
  startDate:  z.string().optional(),
  endDate:    z.string().optional(),
  reportDate: z.string().optional(), // YYYY-MM-DD — дата среза EVM, по умолчанию сегодня
});

/**
 * GET /api/projects/[projectId]/gantt-versions/[versionId]/analytics
 *   ?startDate=2025-01-01&endDate=2025-12-31&reportDate=2025-06-01
 *
 * Возвращает аналитику версии ГПР:
 * - EVM-показатели (EV, AC, PV, BAC, CPI, SPI, CV, SV, TV и % отклонения)
 * - EVM S-кривая (sCurveData) в накопленных суммах по неделям
 * - S-кривая на основе количества задач (sCurve, для обратной совместимости)
 * - Отклонения по срокам, критический путь, готовность ИД
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; versionId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации (multi-tenancy)
    const object = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    // Проверка что версия принадлежит данному объекту
    const version = await db.ganttVersion.findFirst({
      where: { id: params.versionId, projectId: params.projectId },
    });
    if (!version) return errorResponse('Версия ГПР не найдена', 404);

    // Парсинг и валидация query-параметров
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = querySchema.safeParse(searchParams);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { startDate, endDate } = parsed.data;

    // Дата среза EVM: переданная или сегодня (конец дня)
    const reportDateObj = parsed.data.reportDate
      ? new Date(parsed.data.reportDate)
      : new Date();
    reportDateObj.setHours(23, 59, 59, 999);

    // Загружаем все задачи версии и зависимости параллельно
    const [tasks, dependencies] = await Promise.all([
      db.ganttTask.findMany({
        where: { versionId: params.versionId },
        orderBy: { sortOrder: 'asc' },
      }),
      db.ganttDependency.findMany({
        where: { predecessor: { versionId: params.versionId } },
      }),
    ]);

    // ─────────────────────────────────────────────
    // EVM-расчёты
    // ─────────────────────────────────────────────
    const MS_DAY = 86_400_000;

    // BAC — бюджет при завершении (суммарная стоимость всех задач версии)
    const bac = tasks.reduce((s, t) => s + (t.amount ?? 0), 0);

    // Опорные временны́е точки
    const planStartMs  = tasks.map(t => t.planStart.getTime());
    const planEndMs    = tasks.map(t => t.planEnd.getTime());
    const factStartMs  = tasks.filter(t => t.factStart).map(t => t.factStart!.getTime());
    const sacMs        = planEndMs.length    ? Math.max(...planEndMs)    : null;
    const minPlanMs    = planStartMs.length  ? Math.min(...planStartMs)  : null;
    const minFactMs    = factStartMs.length  ? Math.min(...factStartMs)  : null;

    // TAC — продолжительность проекта в днях; AT — фактическое время с первого старта
    const tac = sacMs && minPlanMs ? Math.ceil((sacMs - minPlanMs) / MS_DAY) : 0;
    const at  = minFactMs
      ? Math.max(0, Math.ceil((reportDateObj.getTime() - minFactMs) / MS_DAY))
      : 0;

    // PV — плановый объём на дату среза (amount задач с planEnd ≤ reportDate)
    const pv = tasks
      .filter(t => t.planEnd.getTime() <= reportDateObj.getTime())
      .reduce((s, t) => s + (t.amount ?? 0), 0);

    // EV — освоенный объём (amount задач, фактически завершённых до reportDate)
    const ev = tasks
      .filter(t => t.factEnd !== null && t.factEnd.getTime() <= reportDateObj.getTime())
      .reduce((s, t) => s + (t.amount ?? 0), 0);

    // AC — фактические затраты из КС-2: Ks2Item.totalPrice → Ks2Act.periodEnd ≤ reportDate
    // Скоуп: workItemId задач версии; если у версии есть contractId — ограничиваем им
    const workItemIds = tasks.map(t => t.workItemId).filter(Boolean) as string[];
    let ac = 0;
    if (workItemIds.length > 0) {
      const ks2Items = await db.ks2Item.findMany({
        where: {
          workItemId: { in: workItemIds },
          ks2Act: {
            periodEnd: { lte: reportDateObj },
            ...(version.contractId ? { contractId: version.contractId } : {}),
          },
        },
        select: { totalPrice: true },
      });
      ac = ks2Items.reduce((s, item) => s + item.totalPrice, 0);
    }

    // Индексы производительности (null если делитель = 0)
    const cpi = ac > 0 ? ev / ac : null;
    const spi = pv > 0 ? ev / pv : null;

    // Абсолютные отклонения
    const cv = ev - ac;
    const sv = ev - pv;
    // TV — отклонение по времени (дни): сколько дней отставания/опережения при текущем SPI
    const tv = spi !== null ? at * (spi - 1) : 0;

    // Процентные показатели
    const planPercent    = bac > 0 ? (pv / bac) * 100 : 0;
    const factPercent    = bac > 0 ? (ev / bac) * 100 : 0;
    // forecastPercent: линейная экстраполяция фактического темпа на весь TAC
    const forecastPercent =
      bac > 0 && at > 0 && tac > 0
        ? Math.min(100, (ev / at) * (tac / bac) * 100)
        : factPercent;
    const deviationPercent = planPercent - forecastPercent;

    // ─────────────────────────────────────────────
    // EVM S-кривая (sCurveData): накопленные PV, EV, AC по неделям
    // ─────────────────────────────────────────────
    type EvmPoint = { date: string; pv: number; ev: number; ac: number };
    const sCurveData: EvmPoint[] = [];

    if (tasks.length > 0 && minPlanMs !== null && sacMs !== null) {
      // Загружаем КС-данные для S-кривой одним запросом
      let ks2ItemsForCurve: { totalPrice: number; ks2Act: { periodEnd: Date } }[] = [];
      if (workItemIds.length > 0) {
        ks2ItemsForCurve = await db.ks2Item.findMany({
          where: {
            workItemId: { in: workItemIds },
            ...(version.contractId ? { ks2Act: { contractId: version.contractId } } : {}),
          },
          select: { totalPrice: true, ks2Act: { select: { periodEnd: true } } },
        });
      }

      const MS_WEEK = 7 * MS_DAY;
      for (
        let snap = new Date(minPlanMs);
        snap.getTime() <= sacMs + MS_WEEK;
        snap = new Date(snap.getTime() + MS_WEEK)
      ) {
        const snapMs = snap.getTime();
        const cumPv = tasks
          .filter(t => t.planEnd.getTime() <= snapMs)
          .reduce((s, t) => s + (t.amount ?? 0), 0);
        const cumEv = tasks
          .filter(t => t.factEnd !== null && t.factEnd.getTime() <= snapMs)
          .reduce((s, t) => s + (t.amount ?? 0), 0);
        const cumAc = ks2ItemsForCurve
          .filter(i => i.ks2Act.periodEnd.getTime() <= snapMs)
          .reduce((s, i) => s + i.totalPrice, 0);
        sCurveData.push({
          date: snap.toISOString().slice(0, 10),
          pv:   cumPv,
          ev:   cumEv,
          ac:   cumAc,
        });
      }
    }

    // ─────────────────────────────────────────────
    // Счётная S-кривая (sCurve) — обратная совместимость
    // ─────────────────────────────────────────────
    type SCurvePoint = { date: string; plannedProgress: number; actualProgress: number };
    const sCurve: SCurvePoint[] = [];

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end   = new Date(endDate);
      const totalTasks = tasks.length;

      if (totalTasks > 0 && start <= end) {
        const MS_WEEK = 7 * MS_DAY;
        for (let day = new Date(start); day <= end; day = new Date(day.getTime() + MS_WEEK)) {
          const snapshot = day;
          const plannedDone = tasks.filter(t => t.planEnd.getTime() <= snapshot.getTime()).length;
          const actualDone  = tasks.filter(
            t => t.factEnd !== null && t.factEnd.getTime() <= snapshot.getTime(),
          ).length;
          sCurve.push({
            date:            snapshot.toISOString().slice(0, 10),
            plannedProgress: Math.round((plannedDone / totalTasks) * 100 * 10) / 10,
            actualProgress:  Math.round((actualDone  / totalTasks) * 100 * 10) / 10,
          });
        }
      }
    }

    // ─────────────────────────────────────────────
    // Отклонения по срокам
    // ─────────────────────────────────────────────
    const deviations = tasks
      .filter(
        t =>
          (t.factEnd   !== null && t.factEnd   > t.planEnd)   ||
          (t.factStart !== null && t.factStart > t.planStart),
      )
      .map(t => ({
        taskId: t.id,
        taskName: t.name,
        plannedDays: Math.ceil((t.planEnd.getTime() - t.planStart.getTime()) / MS_DAY),
        actualDays:
          t.factStart !== null && t.factEnd !== null
            ? Math.ceil((t.factEnd.getTime() - t.factStart.getTime()) / MS_DAY)
            : null,
        deltaStart:
          t.factStart !== null
            ? Math.ceil((t.factStart.getTime() - t.planStart.getTime()) / MS_DAY)
            : null,
      }));

    // ─────────────────────────────────────────────
    // Критический путь
    // ─────────────────────────────────────────────
    const criticalIds    = calculateCriticalPath(tasks, dependencies);
    const criticalIdSet  = new Set(criticalIds);
    const criticalTasks  = tasks.filter(t => criticalIdSet.has(t.id));

    // ─────────────────────────────────────────────
    // Готовность исполнительной документации
    // ─────────────────────────────────────────────
    const idReadiness = tasks.map(t => ({
      taskId:         t.id,
      taskName:       t.name,
      linkedDocsCount: t.linkedExecutionDocsCount,
      signedDocsCount: 0, // MVP — интеграция с ExecutionDoc запланирована
    }));

    return successResponse({
      // EVM-показатели
      ev,
      ac,
      pv,
      bac,
      sac:              sacMs ? new Date(sacMs).toISOString().slice(0, 10) : null,
      tac,
      at,
      cv,
      sv,
      tv,
      cpi,
      spi,
      planPercent:      Math.round(planPercent      * 10) / 10,
      factPercent:      Math.round(factPercent      * 10) / 10,
      forecastPercent:  Math.round(forecastPercent  * 10) / 10,
      deviationPercent: Math.round(deviationPercent * 10) / 10,
      sCurveData,
      // Существующие поля (без изменений)
      sCurve,
      deviations,
      criticalPath: { tasks: criticalTasks },
      idReadiness,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения аналитики версии ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
