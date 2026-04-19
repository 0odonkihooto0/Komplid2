import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const fundingRecordSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  recordType: z.enum(['ALLOCATED', 'DELIVERED']),
  federalBudget: z.number().min(0).default(0),
  regionalBudget: z.number().min(0).default(0),
  localBudget: z.number().min(0).default(0),
  ownFunds: z.number().min(0).default(0),
  extraBudget: z.number().min(0).default(0),
});

async function verifyObjectAccess(projectId: string, organizationId: string) {
  return db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const object = await verifyObjectAccess(params.projectId, session.user.organizationId);
    if (!object) return errorResponse('Объект не найден', 404);

    const records = await db.fundingRecord.findMany({
      where: { projectId: params.projectId },
      orderBy: [{ year: 'asc' }, { recordType: 'asc' }],
    });

    return successResponse(records);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения записей финансирования');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const object = await verifyObjectAccess(params.projectId, session.user.organizationId);
    if (!object) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = fundingRecordSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { federalBudget, regionalBudget, localBudget, ownFunds, extraBudget } = parsed.data;
    // totalAmount вычисляется автоматически как сумма всех источников
    const totalAmount = federalBudget + regionalBudget + localBudget + ownFunds + extraBudget;

    const record = await db.fundingRecord.create({
      data: {
        ...parsed.data,
        totalAmount,
        projectId: params.projectId,
      },
    });

    return successResponse(record);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания записи финансирования');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
