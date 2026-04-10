import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type Params = { projectId: string; contractId: string };

// Вспомогательная: проверить доступ к договору
async function findContract(projectId: string, contractId: string, organizationId: string) {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
  });
  if (!project) return null;

  return db.contract.findFirst({ where: { id: contractId, projectId } });
}

const createObligationSchema = z.object({
  description: z.string().min(1, 'Описание обязательства обязательно'),
  amount: z.number().optional(),
  deadline: z.string().optional(),
  status: z.string().optional(),
});

// Получить список обязательств по договору
export async function GET(
  _req: NextRequest,
  { params }: { params: Params },
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.projectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const obligations = await db.contractObligation.findMany({
      where: { contractId: params.contractId },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(obligations);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения обязательств по договору');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Создать обязательство по договору
export async function POST(
  req: NextRequest,
  { params }: { params: Params },
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.projectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const body = await req.json();
    const parsed = createObligationSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const { deadline, ...rest } = parsed.data;

    const obligation = await db.contractObligation.create({
      data: {
        ...rest,
        deadline: deadline ? new Date(deadline) : undefined,
        contractId: params.contractId,
      },
    });

    return successResponse(obligation);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания обязательства по договору');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
