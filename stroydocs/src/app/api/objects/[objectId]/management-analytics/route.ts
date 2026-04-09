import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

interface Ks2ActSummary {
  id: string;
  status: string;
  periodEnd: Date;
  totalAmount: number;
}

// Вспомогательная: сгруппировать платежи по месяцам
function groupPaymentsByMonth(
  payments: { paymentDate: Date; amount: number; paymentType: string }[],
  type: 'PLAN' | 'FACT',
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const p of payments) {
    if (p.paymentType !== type) continue;
    const key = `${p.paymentDate.getFullYear()}-${String(p.paymentDate.getMonth() + 1).padStart(2, '0')}`;
    result[key] = (result[key] ?? 0) + p.amount;
  }
  return result;
}

// Аналитика модуля «Управление проектом» (5 виджетов)
export async function GET(
  req: NextRequest,
  { params }: { params: { objectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
      select: { id: true, name: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10);

    const now = new Date();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    const [contracts, payments] = await Promise.all([
      // Все договоры проекта с суммами
      db.contract.findMany({
        where: { projectId: params.objectId },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          category: { select: { id: true, name: true } },
        },
      }),

      // Платежи за выбранный год
      db.contractPayment.findMany({
        where: {
          contract: { projectId: params.objectId },
          paymentDate: { gte: yearStart, lte: yearEnd },
        },
        select: { paymentType: true, amount: true, paymentDate: true },
        orderBy: { paymentDate: 'asc' },
      }),
    ]);

    // КС-2 акты с датами периода (отдельно для явной типизации)
    const ks2Acts: Ks2ActSummary[] = await db.ks2Act.findMany({
      where: { contract: { projectId: params.objectId } },
      select: { id: true, status: true, periodEnd: true, totalAmount: true },
    });

    // Виджет 1: суммы договоров по категориям (круговая диаграмма)
    const byCategory: Record<string, { name: string; amount: number; count: number }> = {};
    for (const c of contracts) {
      const key = c.category?.id ?? 'other';
      const name = c.category?.name ?? 'Без категории';
      if (!byCategory[key]) byCategory[key] = { name, amount: 0, count: 0 };
      byCategory[key].amount += c.totalAmount ?? 0;
      byCategory[key].count += 1;
    }
    const contractsByCategory = Object.values(byCategory);

    // Виджет 2: плановые платежи по месяцам
    const planByMonth = groupPaymentsByMonth(payments, 'PLAN');
    const planPaymentsChart = Object.entries(planByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }));

    // Виджет 3: план vs факт по месяцам
    const factByMonth = groupPaymentsByMonth(payments, 'FACT');
    const allMonths = Array.from(
      new Set([...Object.keys(planByMonth), ...Object.keys(factByMonth)]),
    ).sort();
    const planVsFactChart = allMonths.map((month) => ({
      month,
      plan: planByMonth[month] ?? 0,
      fact: factByMonth[month] ?? 0,
    }));

    // Виджет 4: статусы договоров (количество и суммы)
    const statusMap: Record<string, { count: number; amount: number }> = {};
    for (const c of contracts) {
      if (!statusMap[c.status]) statusMap[c.status] = { count: 0, amount: 0 };
      statusMap[c.status].count += 1;
      statusMap[c.status].amount += c.totalAmount ?? 0;
    }
    const contractStatuses = Object.entries(statusMap).map(([status, data]) => ({
      status,
      ...data,
    }));

    // Виджет 5: просроченные КС-2 (период закончился, статус не APPROVED)
    const overdueKs2 = ks2Acts.filter(
      (act) => act.periodEnd < now && act.status !== 'APPROVED',
    );

    return successResponse({
      projectId: params.objectId,
      year,
      contractsByCategory,
      planPaymentsChart,
      planVsFactChart,
      contractStatuses,
      overdueKs2: {
        count: overdueKs2.length,
        totalAmount: overdueKs2.reduce((sum, a) => sum + a.totalAmount, 0),
        items: overdueKs2.map((a) => ({ id: a.id, status: a.status, periodEnd: a.periodEnd })),
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка аналитики управления проектом');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
