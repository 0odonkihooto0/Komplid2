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
  completionPercent: z.number().min(0).max(100).optional(),
  workersCount: z.number().int().min(0).optional(),
  equipmentCount: z.number().int().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.objectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const records = await db.contractExecution.findMany({
      where: { contractId: params.contractId },
      orderBy: { date: 'desc' },
    });

    return successResponse(records);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения хода исполнения');
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
    const record = await db.contractExecution.create({
      data: { ...rest, date: new Date(date), contractId: params.contractId },
    });

    return successResponse(record);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания записи хода исполнения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
