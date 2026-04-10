import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type Params = { projectId: string; contractId: string };

async function findContract(projectId: string, contractId: string, organizationId: string) {
  const project = await db.buildingObject.findFirst({ where: { id: projectId, organizationId } });
  if (!project) return null;
  return db.contract.findFirst({ where: { id: contractId, projectId } });
}

const createTableSchema = z.object({
  name: z.string().min(1, 'Название таблицы обязательно').max(200),
});

// Получить список финансовых таблиц договора (без columns/rows — они могут быть большими)
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.projectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const tables = await db.contractFinancialTable.findMany({
      where: { contractId: params.contractId },
      select: { id: true, name: true, contractId: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(tables);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения финансовых таблиц');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Создать финансовую таблицу договора
export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.projectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const body = await req.json();
    const parsed = createTableSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const table = await db.contractFinancialTable.create({
      data: {
        name: parsed.data.name,
        columns: [],
        rows: [],
        contractId: params.contractId,
      },
    });

    return successResponse(table);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания финансовой таблицы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
