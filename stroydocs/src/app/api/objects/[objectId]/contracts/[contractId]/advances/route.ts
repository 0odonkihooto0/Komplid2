import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type Params = { objectId: string; contractId: string };

async function findContract(projectId: string, contractId: string, organizationId: string) {
  const project = await db.buildingObject.findFirst({ where: { id: projectId, organizationId } });
  if (!project) return null;
  return db.contract.findFirst({ where: { id: contractId, projectId } });
}

const createSchema = z.object({
  date: z.string().min(1, 'Дата обязательна'),
  amount: z.number().positive('Сумма должна быть положительной'),
  number: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  budgetType: z.string().max(100).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.objectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const advances = await db.contractAdvance.findMany({
      where: { contractId: params.contractId },
      orderBy: { date: 'desc' },
    });

    return successResponse(advances);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения авансов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.objectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { date, ...rest } = parsed.data;
    const advance = await db.contractAdvance.create({
      data: { ...rest, date: new Date(date), contractId: params.contractId },
    });

    return successResponse(advance);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания аванса');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
