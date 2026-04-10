import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type Params = { projectId: string; contractId: string; obligationId: string };

// Вспомогательная: проверить доступ к договору
async function findContract(projectId: string, contractId: string, organizationId: string) {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
  });
  if (!project) return null;

  return db.contract.findFirst({ where: { id: contractId, projectId } });
}

// Вспомогательная: найти обязательство и убедиться что оно принадлежит договору
async function findObligation(contractId: string, obligationId: string) {
  const obligation = await db.contractObligation.findFirst({
    where: { id: obligationId },
  });
  if (!obligation || obligation.contractId !== contractId) return null;
  return obligation;
}

const updateObligationSchema = z.object({
  description: z.string().min(1, 'Описание обязательства обязательно').optional(),
  amount: z.number().optional(),
  deadline: z.string().optional(),
  status: z.string().optional(),
});

// Обновить обязательство
export async function PUT(
  req: NextRequest,
  { params }: { params: Params },
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.projectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const obligation = await findObligation(params.contractId, params.obligationId);
    if (!obligation) return errorResponse('Обязательство не найдено', 404);

    const body = await req.json();
    const parsed = updateObligationSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const { deadline, ...rest } = parsed.data;

    const updated = await db.contractObligation.update({
      where: { id: params.obligationId },
      data: {
        ...rest,
        ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления обязательства по договору');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Удалить обязательство
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Params },
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.projectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const obligation = await findObligation(params.contractId, params.obligationId);
    if (!obligation) return errorResponse('Обязательство не найдено', 404);

    await db.contractObligation.delete({ where: { id: params.obligationId } });

    return successResponse({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления обязательства по договору');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
