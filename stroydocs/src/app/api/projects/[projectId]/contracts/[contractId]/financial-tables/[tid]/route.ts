import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type Params = { projectId: string; contractId: string; tid: string };

async function findContract(projectId: string, contractId: string, organizationId: string) {
  const project = await db.buildingObject.findFirst({ where: { id: projectId, organizationId } });
  if (!project) return null;
  return db.contract.findFirst({ where: { id: contractId, projectId } });
}

const patchTableSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  columns: z.unknown().optional(),
  rows: z.unknown().optional(),
});

// Получить финансовую таблицу целиком (с columns и rows)
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.projectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const table = await db.contractFinancialTable.findFirst({
      where: { id: params.tid, contractId: params.contractId },
    });
    if (!table) return errorResponse('Таблица не найдена', 404);

    return successResponse(table);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения финансовой таблицы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Обновить финансовую таблицу (debounced PATCH из редактора)
export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.projectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const table = await db.contractFinancialTable.findFirst({
      where: { id: params.tid, contractId: params.contractId },
    });
    if (!table) return errorResponse('Таблица не найдена', 404);

    const body = await req.json();
    const parsed = patchTableSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    // Формируем объект обновления только из переданных полей
    const updateData: Prisma.ContractFinancialTableUpdateInput = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.columns !== undefined) updateData.columns = parsed.data.columns as Prisma.InputJsonValue;
    if (parsed.data.rows !== undefined) updateData.rows = parsed.data.rows as Prisma.InputJsonValue;

    const updated = await db.contractFinancialTable.update({
      where: { id: params.tid },
      data: updateData,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления финансовой таблицы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Удалить финансовую таблицу
export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.projectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const table = await db.contractFinancialTable.findFirst({
      where: { id: params.tid, contractId: params.contractId },
    });
    if (!table) return errorResponse('Таблица не найдена', 404);

    await db.contractFinancialTable.delete({ where: { id: params.tid } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления финансовой таблицы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
