import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface FundingDrillItem {
  objectId:    string;
  objectName:  string;
  year:        number;
  recordType:  string;
  ownFunds:    number;
  extraBudget: number;
  totalAmount: number;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const { searchParams } = req.nextUrl;
    const sourceKey  = searchParams.get('source') ?? '';
    const objectIdParams = searchParams.getAll('objectIds[]').filter(Boolean);

    const objectWhere = objectIdParams.length > 0
      ? { organizationId: orgId, id: { in: objectIdParams } }
      : { organizationId: orgId };

    // Тайп-безопасный фильтр по полю источника
    const sourceFilter = ((): Prisma.FundingRecordWhereInput => {
      switch (sourceKey) {
        case 'federal':  return { federalBudget:  { gt: 0 } };
        case 'regional': return { regionalBudget: { gt: 0 } };
        case 'local':    return { localBudget:    { gt: 0 } };
        case 'own':      return { ownFunds:       { gt: 0 } };
        case 'extra':    return { extraBudget:    { gt: 0 } };
        default:         return {};
      }
    })();

    const records = await db.fundingRecord.findMany({
      where: {
        project: objectWhere,
        ...sourceFilter,
      },
      select: {
        year:           true,
        recordType:     true,
        ownFunds:       true,
        extraBudget:    true,
        totalAmount:    true,
        project: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { project: { name: 'asc' } },
        { year: 'asc' },
      ],
      take: 200,
    });

    const result: FundingDrillItem[] = records.map((r) => ({
      objectId:    r.project.id,
      objectName:  r.project.name,
      year:        r.year,
      recordType:  String(r.recordType),
      ownFunds:    r.ownFunds ?? 0,
      extraBudget: r.extraBudget ?? 0,
      totalAmount: r.totalAmount ?? 0,
    }));

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка funding-drill дашборда');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
