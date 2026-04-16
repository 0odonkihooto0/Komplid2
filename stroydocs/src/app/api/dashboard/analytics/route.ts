import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { getCachedAnalytics } from '@/lib/analytics/cache';
import { getDateRange, buildGprMonthly, safe, cnt } from '@/lib/analytics/dashboard-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const sp = req.nextUrl.searchParams;
    const objectIds = sp.getAll('objectIds[]').filter(Boolean);
    const year = parseInt(sp.get('year') ?? String(new Date().getFullYear()), 10) || new Date().getFullYear();
    const period = sp.get('period') ?? 'year';
    const { dateFrom, dateTo } = getDateRange(year, period);

    // Фильтр объектов (с учётом multi-tenancy)
    const objWhere = objectIds.length > 0
      ? { id: { in: objectIds }, organizationId: orgId }
      : { organizationId: orgId };

    const cacheKey = `analytics:dashboard:${orgId}:${year}:${period}:${[...objectIds].sort().join(',')}`;

    const data = await getCachedAnalytics(cacheKey, async () => {
      const now = new Date();
      const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [
        objByStatus, issuesByTypeRaw,
        pirTasksRaw, pirActsRaw,
        smrTasksRaw, ks2ActsRaw,
        contractsByTypeRaw, gprMonRaw,
        skRaw, defByStatus,
        fundPlanAgg, fundFactAgg,
        paymentsRaw, ks2SumAgg, ctSumAgg,
        smrTasksCurrent, ks2DraftRaw,
        stagesRaw, fundByYearRaw,
      ] = await Promise.all([
        // 1. Объекты по статусам
        safe(() => db.buildingObject.groupBy({ by: ['status'], where: objWhere, _count: { id: true } }), []),
        // 2. Проблемные вопросы по типам
        safe(() => db.problemIssue.groupBy({ by: ['type'], where: { project: objWhere }, _count: { id: true } }), []),
        // 3. ГПР ПИР — задачи
        safe(() => db.ganttTask.findMany({
          where: { version: { isActive: true, stage: { name: { contains: 'ПИР', mode: 'insensitive' }, project: objWhere } }, planEnd: { gte: dateFrom, lte: dateTo } },
          select: { planEnd: true, progress: true, amount: true }, take: 2000,
        }), []),
        // 3. ГПР ПИР — акты закрытия
        safe(() => db.pIRClosureAct.findMany({
          where: { status: 'SIGNED', project: objWhere, periodEnd: { gte: dateFrom, lte: dateTo } },
          select: { periodEnd: true, totalAmount: true },
        }), []),
        // 4. ГПР СМР — задачи
        safe(() => db.ganttTask.findMany({
          where: { version: { isActive: true, stage: { name: { contains: 'СМР', mode: 'insensitive' }, project: objWhere } }, planEnd: { gte: dateFrom, lte: dateTo } },
          select: { planEnd: true, progress: true, amount: true }, take: 2000,
        }), []),
        // 4. ГПР СМР — КС-2
        safe(() => db.ks2Act.findMany({
          where: { status: 'APPROVED', contract: { buildingObject: objWhere }, periodEnd: { gte: dateFrom, lte: dateTo } },
          select: { periodEnd: true, totalAmount: true },
        }), []),
        // 5. Контракты по типам
        safe(() => db.contract.groupBy({ by: ['type'], where: { status: { in: ['ACTIVE', 'COMPLETED'] }, buildingObject: objWhere }, _count: { id: true } }), []),
        // 6. Мониторинг ГПР
        safe(() => db.ganttTask.findMany({
          where: { version: { isActive: true, stage: { name: { contains: 'СМР', mode: 'insensitive' }, project: objWhere } } },
          select: { planStart: true, planEnd: true, progress: true, version: { select: { project: { select: { id: true, name: true } } } } },
          take: 5000,
        }), []),
        // 7. СК-мониторинг
        safe(() => db.defect.groupBy({ by: ['category', 'status'], where: { buildingObject: objWhere }, _count: { id: true } }), []),
        // 8. Недостатки по статусам
        safe(() => db.defect.groupBy({ by: ['status'], where: { buildingObject: objWhere }, _count: { id: true } }), []),
        // 9. Финансирование план
        safe(() => db.fundingRecord.aggregate({ where: { recordType: 'ALLOCATED', project: objWhere }, _sum: { federalBudget: true, regionalBudget: true, localBudget: true, ownFunds: true, extraBudget: true } }), null),
        // 10. Финансирование факт
        safe(() => db.fundingRecord.aggregate({ where: { recordType: 'DELIVERED', project: objWhere }, _sum: { federalBudget: true, regionalBudget: true, localBudget: true, ownFunds: true, extraBudget: true } }), null),
        // 11. Платежи
        safe(() => db.contractPayment.findMany({ where: { contract: { buildingObject: objWhere } }, select: { paymentType: true, amount: true, paymentDate: true } }), []),
        // 12. КС-2 сумма (освоено)
        safe(() => db.ks2Act.aggregate({ where: { status: 'APPROVED', contract: { buildingObject: objWhere } }, _sum: { totalAmount: true } }), null),
        // 12. Контракты СМР сумма (план)
        safe(() => db.contract.aggregate({ where: { type: 'MAIN', status: { in: ['ACTIVE', 'COMPLETED'] }, buildingObject: objWhere }, _sum: { totalAmount: true } }), null),
        // 14. Задачи СМР (текущие версии)
        safe(() => db.ganttTask.findMany({
          where: { version: { isActive: true, stage: { name: { contains: 'СМР', mode: 'insensitive' }, project: objWhere } } },
          select: { progress: true, planEnd: true }, take: 5000,
        }), []),
        // 14. Черновики КС-2 (просроченные)
        safe(() => db.ks2Act.findMany({
          where: { status: 'DRAFT', contract: { buildingObject: objWhere }, periodEnd: { lt: now } },
          select: { totalAmount: true },
        }), []),
        // 13. Стадии реализации
        safe(() => db.ganttStage.groupBy({ by: ['name'], where: { isCurrent: true, project: objWhere }, _count: { id: true } }), []),
        // 15. Финансирование по годам
        safe(() => db.fundingRecord.groupBy({ by: ['year', 'recordType'], where: { project: objWhere }, _sum: { totalAmount: true }, orderBy: { year: 'asc' } }), []),
      ]);

      // ─── 1. objectsByStatus ───────────────────────────────────────────────
      const objTotal = objByStatus.reduce((s, r) => s + cnt(r), 0);
      const objectsByStatus = objByStatus.map((r) => ({
        status: r.status as string, count: cnt(r),
        percent: objTotal > 0 ? Math.round((cnt(r) / objTotal) * 100) : 0,
      }));

      // ─── 2. issuesByType ──────────────────────────────────────────────────
      const issuesByType = issuesByTypeRaw.map((r) => ({ type: r.type as string, count: cnt(r) }));

      // ─── 3–4. GPR аналитика по месяцам ────────────────────────────────────
      const gprPirAnalytics = buildGprMonthly(pirTasksRaw, pirActsRaw);
      const gprSmrAnalytics = buildGprMonthly(smrTasksRaw, ks2ActsRaw);

      // ─── 5. contractsByType ───────────────────────────────────────────────
      const contractsByType = contractsByTypeRaw.map((r) => ({ type: r.type as string, count: cnt(r) }));

      // ─── 6. gprMonitoring — группировка по объекту ────────────────────────
      const gprMap = new Map<string, { name: string; planStart: Date; planEnd: Date; progressSum: number; count: number }>();
      for (const t of gprMonRaw) {
        const proj = t.version?.project;
        if (!proj) continue;
        const existing = gprMap.get(proj.id);
        const pS = new Date(t.planStart), pE = new Date(t.planEnd);
        if (!existing) {
          gprMap.set(proj.id, { name: proj.name, planStart: pS, planEnd: pE, progressSum: t.progress, count: 1 });
        } else {
          if (pS < existing.planStart) existing.planStart = pS;
          if (pE > existing.planEnd) existing.planEnd = pE;
          existing.progressSum += t.progress;
          existing.count += 1;
        }
      }
      const gprMonitoring = Array.from(gprMap.entries()).map(([objectId, v]) => {
        const totalDays = (v.planEnd.getTime() - v.planStart.getTime()) / 86400000;
        const elapsed = Math.max(0, (now.getTime() - v.planStart.getTime()) / 86400000);
        const planPct = totalDays > 0 ? Math.min(100, Math.round((elapsed / totalDays) * 100)) : 0;
        const factPct = v.count > 0 ? Math.round(v.progressSum / v.count) : 0;
        const delayDays = now > v.planEnd ? Math.round((now.getTime() - v.planEnd.getTime()) / 86400000) : 0;
        return { objectId, name: v.name, planStart: v.planStart, planEnd: v.planEnd, planPct, factPct, delayDays };
      });

      // ─── 7. skMonitoring — pivot по категории ────────────────────────────
      const skMap = new Map<string, { closed: number; active: number; pending: number }>();
      for (const r of skRaw) {
        const cat = r.category as string;
        if (!skMap.has(cat)) skMap.set(cat, { closed: 0, active: 0, pending: 0 });
        const c = cnt(r), entry = skMap.get(cat)!;
        if (r.status === 'CONFIRMED') entry.closed += c;
        else if (r.status === 'OPEN' || r.status === 'IN_PROGRESS') entry.active += c;
        else if (r.status === 'RESOLVED') entry.pending += c;
      }
      const skMonitoring = Array.from(skMap.entries()).map(([category, v]) => ({
        category, ...v, total: v.closed + v.active + v.pending,
      }));

      // ─── 8. defectsByStatus ───────────────────────────────────────────────
      const defectsByStatus = defByStatus.map((r) => ({ status: r.status as string, count: cnt(r) }));

      // ─── 9–10. fundingPlan / fundingFact ──────────────────────────────────
      const toSources = (agg: typeof fundPlanAgg) => {
        const s = agg?._sum;
        return [
          { source: 'Федеральный бюджет', amount: s?.federalBudget ?? 0 },
          { source: 'Региональный бюджет', amount: s?.regionalBudget ?? 0 },
          { source: 'Местный бюджет', amount: s?.localBudget ?? 0 },
          { source: 'Собственные средства', amount: s?.ownFunds ?? 0 },
          { source: 'Внебюджетные средства', amount: s?.extraBudget ?? 0 },
        ].filter((x) => x.amount > 0);
      };
      const fundingPlan = toSources(fundPlanAgg);
      const fundingFact = toSources(fundFactAgg);

      // ─── 11. contractsPayments ────────────────────────────────────────────
      const payMap = new Map<number, { paid: number; planned: number }>();
      for (const p of paymentsRaw) {
        const yr = new Date(p.paymentDate).getFullYear();
        if (!payMap.has(yr)) payMap.set(yr, { paid: 0, planned: 0 });
        const entry = payMap.get(yr)!;
        if (p.paymentType === 'FACT') entry.paid += p.amount;
        else entry.planned += p.amount;
      }
      const contractsPayments = Array.from(payMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([yr, v]) => ({ year: yr, paid: Math.round(v.paid), planned: Math.round(v.planned) }));

      // ─── 12. smrContractsOsvoeno ──────────────────────────────────────────
      const done = ks2SumAgg?._sum.totalAmount ?? 0;
      const total = ctSumAgg?._sum.totalAmount ?? 0;
      const smrContractsOsvoeno = { done: Math.round(done), total: Math.round(total), remainder: Math.round(total - done) };

      // ─── 13. implementationStages ─────────────────────────────────────────
      const implementationStages = stagesRaw.map((r) => ({ stage: r.name, count: cnt(r) }));

      // ─── 14. smrCurrentAnalytics ──────────────────────────────────────────
      const execDone = smrTasksCurrent.filter((t) => t.progress >= 100).length;
      const execTotal = smrTasksCurrent.length;
      const execPlanToday = smrTasksCurrent.filter((t) => t.progress < 100 && new Date(t.planEnd) >= now && new Date(t.planEnd) <= weekAhead).length;
      const execOverdue = smrTasksCurrent.filter((t) => t.progress < 100 && new Date(t.planEnd) < now).length;
      const osvPlanToday = Math.round(ks2DraftRaw.reduce((s, a) => s + (a.totalAmount ?? 0), 0));
      const smrCurrentAnalytics = {
        execDone, execTotal, execPlanToday, execOverdue,
        osvDone: Math.round(done), osvTotal: Math.round(total),
        osvPlanToday, osvOverdue: ks2DraftRaw.length,
      };

      // ─── 15. financingByYear ──────────────────────────────────────────────
      const fyMap = new Map<number, { plan: number; fact: number }>();
      for (const r of fundByYearRaw) {
        if (!fyMap.has(r.year)) fyMap.set(r.year, { plan: 0, fact: 0 });
        const entry = fyMap.get(r.year)!;
        const amt = r._sum.totalAmount ?? 0;
        if (r.recordType === 'ALLOCATED') entry.plan += amt;
        else entry.fact += amt;
      }
      const financingByYear = Array.from(fyMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([yr, v]) => ({ year: yr, plan: Math.round(v.plan), fact: Math.round(v.fact) }));

      return {
        objectsByStatus, issuesByType, gprPirAnalytics, gprSmrAnalytics,
        contractsByType, gprMonitoring, skMonitoring, defectsByStatus,
        fundingPlan, fundingFact, contractsPayments, smrContractsOsvoeno,
        implementationStages, smrCurrentAnalytics, financingByYear,
      };
    });

    return successResponse(data);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка аналитики дашборда');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
