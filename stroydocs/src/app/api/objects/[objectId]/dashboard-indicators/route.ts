import { NextRequest, NextResponse } from 'next/server';
import { PIRClosureStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

interface Params {
  objectId: string;
}

// Статус выполнения индикатора относительно плана на сегодня
type IndicatorStatus = 'OK' | 'OVERDUE' | 'AHEAD';

function calcStatus(factTotal: number, planToday: number): IndicatorStatus {
  if (planToday <= 0) return 'OK';
  if (factTotal < planToday * 0.95) return 'OVERDUE';
  if (factTotal > planToday * 1.05) return 'AHEAD';
  return 'OK';
}

export interface DashboardIndicator {
  planTotal: number;    // Общий план по ГПР (всего)
  planToday: number;    // План на сегодня (должно быть выполнено к текущей дате)
  factTotal: number;    // Факт (выполнено)
  percent: number;      // factTotal / planTotal * 100
  status: IndicatorStatus;
}

export interface DashboardIndicatorsResponse {
  gprExec: DashboardIndicator;  // Выполнение по графикам (все стадии)
  pirOsv: DashboardIndicator;   // Освоение по графикам ПИР
  smrOsv: DashboardIndicator;   // Освоение по графикам СМР (КС-2)
  payments: DashboardIndicator; // Оплачено по контрактам
}

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { objectId } = params;

    // Проверяем доступ к объекту
    const object = await db.buildingObject.findFirst({
      where: { id: objectId, organizationId: orgId },
      select: { id: true },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const [
      // ГПР — все активные версии объекта
      gprTasks,
      gprTasksToday,

      // ПИР стадии объекта
      pirStages,

      // СМР стадии объекта
      smrStages,

      // Акты закрытия ПИР (подписанные)
      pirClosureSum,

      // Акты КС-2 (утверждённые)
      ks2Sum,

      // Контракты — план
      contractsTotalSum,

      // Фактические платежи по контрактам
      factPaymentsSum,
    ] = await Promise.all([
      // Все задачи активных версий ГПР объекта
      db.ganttTask.findMany({
        where: {
          version: { isActive: true, projectId: objectId },
          parentId: null, // Только корневые задачи для избежания двойного счёта — TODO: при необходимости убрать
        },
        select: { amount: true, progress: true, planEnd: true },
      }),

      // Задачи, плановая дата окончания которых ≤ сегодня
      db.ganttTask.findMany({
        where: {
          version: { isActive: true, projectId: objectId },
          parentId: null,
          planEnd: { lte: today },
        },
        select: { amount: true },
      }),

      // Стадии ПИР объекта
      db.ganttStage.findMany({
        where: {
          projectId: objectId,
          name: { contains: 'ПИР', mode: 'insensitive' },
        },
        select: { id: true },
      }),

      // Стадии СМР объекта
      db.ganttStage.findMany({
        where: {
          projectId: objectId,
          name: { contains: 'СМР', mode: 'insensitive' },
        },
        select: { id: true },
      }),

      // Акты закрытия ПИР (подписанные или проведённые)
      db.pIRClosureAct.aggregate({
        where: {
          projectId: objectId,
          status: { in: [PIRClosureStatus.SIGNED, PIRClosureStatus.CONDUCTED] },
        },
        _sum: { totalAmount: true },
      }),

      // Утверждённые акты КС-2
      db.ks2Act.aggregate({
        where: { contract: { projectId: objectId }, status: 'APPROVED' },
        _sum: { totalAmount: true },
      }),

      // Общая сумма контрактов объекта
      db.contract.aggregate({
        where: { projectId: objectId },
        _sum: { totalAmount: true },
      }),

      // Фактические платежи (оплата)
      db.contractPayment.aggregate({
        where: { contract: { projectId: objectId }, paymentType: 'FACT' },
        _sum: { amount: true },
      }),
    ]);

    // === Индикатор 1: Выполнение по графикам (все стадии ГПР) ===
    let gprPlanTotal = 0;
    let gprFactTotal = 0;
    let gprPlanToday = 0;

    for (const task of gprTasks) {
      const amt = task.amount ?? 0;
      gprPlanTotal += amt;
      gprFactTotal += amt * (task.progress / 100);
    }
    for (const task of gprTasksToday) {
      gprPlanToday += task.amount ?? 0;
    }

    const gprPercent = gprPlanTotal > 0 ? Math.round((gprFactTotal / gprPlanTotal) * 100) : 0;

    const gprExec: DashboardIndicator = {
      planTotal: gprPlanTotal,
      planToday: gprPlanToday,
      factTotal: gprFactTotal,
      percent: gprPercent,
      status: calcStatus(gprFactTotal, gprPlanToday),
    };

    // === Индикатор 2: Освоение ПИР (задачи ПИР-стадий + акты закрытия ПИР) ===
    const pirStageIds = pirStages.map((s) => s.id);

    let pirPlanTotal = 0;
    let pirFactTotal = 0;
    let pirPlanToday = 0;

    if (pirStageIds.length > 0) {
      const [pirTasks, pirTasksToday] = await Promise.all([
        db.ganttTask.findMany({
          where: {
            version: { isActive: true, projectId: objectId, stageId: { in: pirStageIds } },
            parentId: null,
          },
          select: { amount: true, progress: true },
        }),
        db.ganttTask.findMany({
          where: {
            version: { isActive: true, projectId: objectId, stageId: { in: pirStageIds } },
            parentId: null,
            planEnd: { lte: today },
          },
          select: { amount: true },
        }),
      ]);

      for (const task of pirTasks) {
        const amt = task.amount ?? 0;
        pirPlanTotal += amt;
        pirFactTotal += amt * (task.progress / 100);
      }
      for (const task of pirTasksToday) {
        pirPlanToday += task.amount ?? 0;
      }
    }

    // Прибавляем фактическое освоение из актов закрытия ПИР
    const pirClosureFactAmount = pirClosureSum._sum.totalAmount ?? 0;
    // Если есть суммы из актов — корректируем факт (берём максимум)
    if (pirClosureFactAmount > pirFactTotal) {
      pirFactTotal = pirClosureFactAmount;
    }

    const pirPercent = pirPlanTotal > 0 ? Math.round((pirFactTotal / pirPlanTotal) * 100) : 0;

    const pirOsv: DashboardIndicator = {
      planTotal: pirPlanTotal,
      planToday: pirPlanToday,
      factTotal: pirFactTotal,
      percent: pirPercent,
      status: calcStatus(pirFactTotal, pirPlanToday),
    };

    // === Индикатор 3: Освоение СМР (задачи СМР-стадий + КС-2) ===
    const smrStageIds = smrStages.map((s) => s.id);

    let smrPlanTotal = 0;
    let smrPlanToday = 0;

    if (smrStageIds.length > 0) {
      const [smrTasks, smrTasksToday] = await Promise.all([
        db.ganttTask.findMany({
          where: {
            version: { isActive: true, projectId: objectId, stageId: { in: smrStageIds } },
            parentId: null,
          },
          select: { amount: true },
        }),
        db.ganttTask.findMany({
          where: {
            version: { isActive: true, projectId: objectId, stageId: { in: smrStageIds } },
            parentId: null,
            planEnd: { lte: today },
          },
          select: { amount: true },
        }),
      ]);

      for (const task of smrTasks) {
        smrPlanTotal += task.amount ?? 0;
      }
      for (const task of smrTasksToday) {
        smrPlanToday += task.amount ?? 0;
      }
    }

    // Факт СМР — из актов КС-2 (более достоверный источник)
    const smrFactTotal = ks2Sum._sum.totalAmount ?? 0;
    // Если нет стадий СМР в ГПР — используем общий план контрактов как fallback
    if (smrPlanTotal === 0) {
      smrPlanTotal = contractsTotalSum._sum.totalAmount ?? 0;
    }

    const smrPercent = smrPlanTotal > 0 ? Math.round((smrFactTotal / smrPlanTotal) * 100) : 0;

    const smrOsv: DashboardIndicator = {
      planTotal: smrPlanTotal,
      planToday: smrPlanToday,
      factTotal: smrFactTotal,
      percent: smrPercent,
      status: calcStatus(smrFactTotal, smrPlanToday),
    };

    // === Индикатор 4: Оплачено по контрактам ===
    const payPlanTotal = contractsTotalSum._sum.totalAmount ?? 0;
    const payFactTotal = factPaymentsSum._sum.amount ?? 0;
    const payPercent = payPlanTotal > 0 ? Math.round((payFactTotal / payPlanTotal) * 100) : 0;

    const payments: DashboardIndicator = {
      planTotal: payPlanTotal,
      planToday: payPlanTotal, // Для оплаты планТОДАЙ = полный план (оплата ожидается в конце)
      factTotal: payFactTotal,
      percent: payPercent,
      status: calcStatus(payFactTotal, payPlanTotal * 0.5), // Предупреждение при оплате < 50%
    };

    const result: DashboardIndicatorsResponse = { gprExec, pirOsv, smrOsv, payments };
    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения индикаторов дашборда');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
