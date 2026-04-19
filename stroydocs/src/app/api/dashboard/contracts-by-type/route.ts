import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const sp = req.nextUrl.searchParams;
    // type теперь contractKindId (UUID) или '__NONE__' для договоров без вида работ
    const type = sp.get('type');
    const objectIds = sp.getAll('objectIds[]').filter(Boolean);

    if (!type) return errorResponse('Параметр type обязателен', 400);

    const objWhere = objectIds.length > 0
      ? { id: { in: objectIds }, organizationId: orgId }
      : { organizationId: orgId };

    const contracts = await db.contract.findMany({
      where: {
        contractKindId: type === '__NONE__' ? null : type,
        status: { in: ['ACTIVE', 'COMPLETED'] },
        buildingObject: objWhere,
      },
      select: {
        id: true,
        number: true,
        name: true,
        type: true,
        contractKindId: true,
        contractKind: { select: { name: true } },
        status: true,
        startDate: true,
        projectId: true,
        _count: { select: { childContracts: true } },
      },
      orderBy: { startDate: 'desc' },
      take: 200,
    });

    return successResponse(contracts);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения контрактов по виду для дашборда');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
