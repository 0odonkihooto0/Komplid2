import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// Сгруппировать суммы платежей по месяцам
function groupByMonth(
  payments: { paymentDate: Date; amount: number }[],
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const p of payments) {
    const key = `${p.paymentDate.getFullYear()}-${String(p.paymentDate.getMonth() + 1).padStart(2, '0')}`;
    result[key] = (result[key] ?? 0) + p.amount;
  }
  return result;
}

// Преобразовать сгруппированные данные в массив с накопительным итогом
function toCumulative(monthMap: Record<string, number>): { month: string; amount: number; cumulative: number }[] {
  let acc = 0;
  return Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => {
      acc += amount;
      return { month, amount, cumulative: acc };
    });
}

// Маппинг статуса договора → читаемое название для диаграммы
function mapStatus(status: string): string {
  if (status === 'ACTIVE') return 'Подписан';
  if (status === 'TERMINATED') return 'Расторгнут';
  return 'Не подписан'; // DRAFT, COMPLETED
}

// Аналитика по контрактам объекта: 4 виджета
export async function GET(
  req: NextRequest,
  { params }: { params: { objectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), 0, 1); // 1 января текущего года

    const fromParam = searchParams.get('from');
    const toParam   = searchParams.get('to');
    const from = fromParam ? new Date(fromParam) : defaultFrom;
    const to   = toParam   ? new Date(toParam)   : now;

    // Параллельные запросы к БД
    const [activeContracts, planPayments, factPayments, allContracts] = await Promise.all([
      // Виджет 1: стоимость по подписанным контрактам
      db.contract.findMany({
        where: { projectId: params.objectId, status: 'ACTIVE' },
        select: { id: true, number: true, name: true, totalAmount: true },
        orderBy: { totalAmount: 'desc' },
      }),

      // Виджет 2: плановые платежи в выбранном диапазоне
      db.contractPayment.findMany({
        where: {
          contract: { projectId: params.objectId },
          paymentType: 'PLAN',
          paymentDate: { gte: from, lte: to },
        },
        select: { amount: true, paymentDate: true },
        orderBy: { paymentDate: 'asc' },
      }),

      // Виджет 3: фактические платежи в выбранном диапазоне
      db.contractPayment.findMany({
        where: {
          contract: { projectId: params.objectId },
          paymentType: 'FACT',
          paymentDate: { gte: from, lte: to },
        },
        select: { amount: true, paymentDate: true },
        orderBy: { paymentDate: 'asc' },
      }),

      // Виджет 4: все контракты для распределения по статусам
      db.contract.findMany({
        where: { projectId: params.objectId },
        select: { status: true },
      }),
    ]);

    // Виджет 1: стоимость по контрактам
    const costByContract = activeContracts.map((c) => ({
      contractId: c.id,
      name: c.number ? `${c.number} — ${c.name}` : c.name,
      amount: c.totalAmount ?? 0,
    }));

    // Виджет 2: плановые платежи с накопительным итогом
    const plannedPayments = toCumulative(groupByMonth(planPayments));

    // Виджет 3: фактические платежи с накопительным итогом
    const factPaymentsData = toCumulative(groupByMonth(factPayments));

    // Виджет 4: распределение по статусам
    const statusCount: Record<string, number> = {};
    for (const c of allContracts) {
      const label = mapStatus(c.status);
      statusCount[label] = (statusCount[label] ?? 0) + 1;
    }
    const total = allContracts.length;
    const statusDistribution = Object.entries(statusCount).map(([status, count]) => ({
      status,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }));

    return successResponse({
      costByContract,
      plannedPayments,
      factPayments: factPaymentsData,
      statusDistribution,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка аналитики контрактов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
