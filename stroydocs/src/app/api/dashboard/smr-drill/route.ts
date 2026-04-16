import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

interface SmrDrillItem {
  objectId:   string;
  objectName: string;
  smrCost:    number;
  total:      number;
  remainder:  number;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const { searchParams } = req.nextUrl;
    const yearParam      = searchParams.get('year');
    const objectIdParams = searchParams.getAll('objectIds[]').filter(Boolean);

    const year = yearParam ? parseInt(yearParam, 10) : null;

    const objectWhere = objectIdParams.length > 0
      ? { organizationId: orgId, id: { in: objectIdParams } }
      : { organizationId: orgId };

    // Фильтр по году для КС-2 актов
    const yearFilter = year
      ? {
          periodEnd: {
            gte: new Date(`${year}-01-01`),
            lte: new Date(`${year}-12-31`),
          },
        }
      : {};

    // КС-2 акты (освоено)
    const [ks2Raw, contractsRaw] = await Promise.all([
      db.ks2Act.findMany({
        where: {
          status: 'APPROVED',
          contract: { buildingObject: objectWhere },
          ...yearFilter,
        },
        select: {
          totalAmount: true,
          contract: {
            select: {
              buildingObject: {
                select: { id: true, name: true },
              },
            },
          },
        },
        take: 2000,
      }),
      // Контракты СМР (план)
      db.contract.findMany({
        where: {
          type:          'MAIN',
          status:        { in: ['ACTIVE', 'COMPLETED'] },
          buildingObject: objectWhere,
        },
        select: {
          totalAmount:    true,
          buildingObject: { select: { id: true, name: true } },
        },
        take: 500,
      }),
    ]);

    // Группируем КС-2 по объекту
    const ks2Map = new Map<string, { name: string; smrCost: number }>();
    for (const a of ks2Raw) {
      const obj = a.contract.buildingObject;
      if (!ks2Map.has(obj.id)) ks2Map.set(obj.id, { name: obj.name, smrCost: 0 });
      ks2Map.get(obj.id)!.smrCost += a.totalAmount ?? 0;
    }

    // Группируем контракты по объекту
    const ctMap = new Map<string, { name: string; total: number }>();
    for (const c of contractsRaw) {
      const obj = c.buildingObject;
      if (!ctMap.has(obj.id)) ctMap.set(obj.id, { name: obj.name, total: 0 });
      ctMap.get(obj.id)!.total += c.totalAmount ?? 0;
    }

    // Объединяем — включаем все объекты из обоих источников
    const allIds = new Set([...Array.from(ks2Map.keys()), ...Array.from(ctMap.keys())]);
    const result: SmrDrillItem[] = Array.from(allIds)
      .map((objectId) => {
        const ks2  = ks2Map.get(objectId);
        const ct   = ctMap.get(objectId);
        const name = ks2?.name ?? ct?.name ?? '';
        const smrCost  = Math.round(ks2?.smrCost ?? 0);
        const total    = Math.round(ct?.total ?? 0);
        return { objectId, objectName: name, smrCost, total, remainder: total - smrCost };
      })
      .sort((a, b) => a.objectName.localeCompare(b.objectName, 'ru'));

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка smr-drill дашборда');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
