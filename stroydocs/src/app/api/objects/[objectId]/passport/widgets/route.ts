import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/** Линейная интерполяция ожидаемого освоения на текущий момент */
function computeDelta(
  total: number,
  mastered: number,
  startDate: Date | null,
  endDate: Date | null,
): { delta: number; isAhead: boolean } {
  if (!startDate || !endDate || total === 0) {
    return { delta: 0, isAhead: mastered >= 0 };
  }
  const now = Date.now();
  const start = startDate.getTime();
  const end = endDate.getTime();
  if (end <= start) return { delta: 0, isAhead: mastered >= 0 };
  const timeRatio = Math.min(1, Math.max(0, (now - start) / (end - start)));
  const expected = total * timeRatio;
  const delta = mastered - expected;
  return { delta: parseFloat(delta.toFixed(2)), isAhead: delta >= 0 };
}

// GET — данные виджетов ПИР и СМР для паспорта объекта
export async function GET(
  _req: NextRequest,
  { params }: { params: { objectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const object = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    const projectId = params.objectId;

    const [
      pirContracts,
      pirMasteredAgg,
      smrTotalAgg,
      smrMasteredAgg,
      allContracts,
    ] = await Promise.all([
      // ПИР: контракты с категорией, содержащей «пир» (без учёта регистра)
      db.contract.findMany({
        where: {
          projectId,
          category: { name: { contains: 'пир', mode: 'insensitive' } },
        },
        select: { totalAmount: true, startDate: true, endDate: true },
      }),

      // ПИР: сумма подписанных актов закрытия
      db.pIRClosureAct.aggregate({
        where: { projectId, status: 'SIGNED' },
        _sum: { totalAmount: true },
      }),

      // СМР: суммарный объём всех контрактов
      db.contract.aggregate({
        where: { projectId },
        _sum: { totalAmount: true },
      }),

      // СМР: сумма утверждённых актов КС-2
      db.ks2Act.aggregate({
        where: { contract: { projectId }, status: 'APPROVED' },
        _sum: { totalAmount: true },
      }),

      // СМР: даты контрактов
      db.contract.findMany({
        where: { projectId },
        select: { startDate: true, endDate: true },
      }),
    ]);

    // --- ПИР ---
    const pirTotal = pirContracts.reduce(
      (sum, c) => sum + (c.totalAmount ?? 0),
      0,
    );
    const pirMastered = pirMasteredAgg._sum.totalAmount ?? 0;
    const pirCompletionPercent =
      pirTotal > 0
        ? parseFloat(((pirMastered / pirTotal) * 100).toFixed(1))
        : 0;

    // Даты ПИР — из ПИР-контрактов
    const pirStartDates = pirContracts
      .map((c) => c.startDate)
      .filter((d): d is Date => d !== null);
    const pirEndDates = pirContracts
      .map((c) => c.endDate)
      .filter((d): d is Date => d !== null);
    const pirStartDate = pirStartDates.length
      ? new Date(Math.min(...pirStartDates.map((d) => d.getTime())))
      : null;
    const pirEndDate = pirEndDates.length
      ? new Date(Math.max(...pirEndDates.map((d) => d.getTime())))
      : null;

    const pirDelta = computeDelta(pirTotal, pirMastered, pirStartDate, pirEndDate);

    // --- СМР ---
    const smrTotal = smrTotalAgg._sum.totalAmount ?? 0;
    const smrMastered = smrMasteredAgg._sum.totalAmount ?? 0;
    const smrCompletionPercent =
      smrTotal > 0
        ? parseFloat(((smrMastered / smrTotal) * 100).toFixed(1))
        : 0;

    // Даты СМР — из всех контрактов
    const smrStartDates = allContracts
      .map((c) => c.startDate)
      .filter((d): d is Date => d !== null);
    const smrEndDates = allContracts
      .map((c) => c.endDate)
      .filter((d): d is Date => d !== null);
    const smrStartDate = smrStartDates.length
      ? new Date(Math.min(...smrStartDates.map((d) => d.getTime())))
      : null;
    const smrEndDate = smrEndDates.length
      ? new Date(Math.max(...smrEndDates.map((d) => d.getTime())))
      : null;

    const smrDelta = computeDelta(smrTotal, smrMastered, smrStartDate, smrEndDate);

    return successResponse({
      pir: {
        totalAmount: pirTotal,
        mastered: pirMastered,
        completionPercent: pirCompletionPercent,
        planStartDate: pirStartDate?.toISOString() ?? null,
        planEndDate: pirEndDate?.toISOString() ?? null,
        delta: pirDelta.delta,
        isAhead: pirDelta.isAhead,
      },
      smr: {
        totalAmount: smrTotal,
        mastered: smrMastered,
        completionPercent: smrCompletionPercent,
        planStartDate: smrStartDate?.toISOString() ?? null,
        planEndDate: smrEndDate?.toISOString() ?? null,
        delta: smrDelta.delta,
        isAhead: smrDelta.isAhead,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка виджетов паспорта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
