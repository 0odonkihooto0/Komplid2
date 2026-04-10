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
  amount: z.number().positive('Сумма должна быть положительной'),
  percentage: z.number().min(0).max(100).optional(),
  retentionDate: z.string().optional(),
  releaseDate: z.string().optional(),
  status: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.objectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const guarantees = await db.contractGuarantee.findMany({
      where: { contractId: params.contractId },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(guarantees);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения гарантийных удержаний');
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

    const { retentionDate, releaseDate, ...rest } = parsed.data;
    const guarantee = await db.contractGuarantee.create({
      data: {
        ...rest,
        ...(retentionDate ? { retentionDate: new Date(retentionDate) } : {}),
        ...(releaseDate ? { releaseDate: new Date(releaseDate) } : {}),
        contractId: params.contractId,
      },
    });

    return successResponse(guarantee);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания гарантийного удержания');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
