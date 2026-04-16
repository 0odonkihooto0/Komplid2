import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

interface PaymentDrillItem {
  objectId:   string;
  objectName: string;
  paid:       number;
  planned:    number;
  deviation:  number;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const { searchParams } = req.nextUrl;
    const objectIdParams = searchParams.getAll('objectIds[]').filter(Boolean);

    const objectWhere = objectIdParams.length > 0
      ? { organizationId: orgId, id: { in: objectIdParams } }
      : { organizationId: orgId };

    // Получаем все платежи с информацией об объекте строительства
    const payments = await db.contractPayment.findMany({
      where: {
        contract: { buildingObject: objectWhere },
      },
      select: {
        paymentType: true,
        amount:      true,
        contract: {
          select: {
            buildingObject: {
              select: { id: true, name: true },
            },
          },
        },
      },
      take: 2000,
    });

    // Группируем по объекту строительства
    const objMap = new Map<string, { name: string; paid: number; planned: number }>();
    for (const p of payments) {
      const obj = p.contract.buildingObject;
      if (!objMap.has(obj.id)) {
        objMap.set(obj.id, { name: obj.name, paid: 0, planned: 0 });
      }
      const entry = objMap.get(obj.id)!;
      if (p.paymentType === 'FACT') {
        entry.paid += p.amount;
      } else {
        entry.planned += p.amount;
      }
    }

    const result: PaymentDrillItem[] = Array.from(objMap.entries())
      .map(([objectId, v]) => ({
        objectId,
        objectName: v.name,
        paid:       Math.round(v.paid),
        planned:    Math.round(v.planned),
        deviation:  Math.round(v.planned - v.paid),
      }))
      .sort((a, b) => a.objectName.localeCompare(b.objectName, 'ru'));

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка payment-drill дашборда');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
