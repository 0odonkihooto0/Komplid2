import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { projectId: string; contractId: string; tid: string };

// Перезаполнить финансовую таблицу данными из ГПР (диаграмма Ганта договора)
export async function POST(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const contract = await db.contract.findFirst({
      where: { id: params.contractId, projectId: params.projectId },
    });
    if (!contract) return errorResponse('Договор не найден', 404);

    const table = await db.contractFinancialTable.findFirst({
      where: { id: params.tid, contractId: params.contractId },
    });
    if (!table) return errorResponse('Таблица не найдена', 404);

    // Ищем активную версию ГПР этого договора
    const activeVersion = await db.ganttVersion.findFirst({
      where: { contractId: params.contractId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeVersion) {
      return errorResponse('ГПР не подключён: активная версия графика не найдена', 422);
    }

    // Берём только корневые задачи (без вложенных) для сводного финансирования
    const tasks = await db.ganttTask.findMany({
      where: { versionId: activeVersion.id, parentId: null },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        planStart: true,
        planEnd: true,
        progress: true,
        amount: true,
      },
    });

    // Формируем структуру колонок
    const columns = [
      { key: 'name',      label: 'Наименование работ' },
      { key: 'planStart', label: 'Начало' },
      { key: 'planEnd',   label: 'Окончание' },
      { key: 'progress',  label: '% выполнения' },
      { key: 'amount',    label: 'Стоимость, руб.' },
    ];

    // Преобразуем задачи в строки таблицы
    const rows = tasks.map((t) => ({
      id: t.id,
      name: t.name,
      planStart: t.planStart.toISOString().slice(0, 10),
      planEnd: t.planEnd.toISOString().slice(0, 10),
      progress: t.progress.toString(),
      amount: t.amount?.toString() ?? '',
    }));

    const updated = await db.contractFinancialTable.update({
      where: { id: params.tid },
      data: {
        columns: columns as Prisma.InputJsonValue,
        rows: rows as Prisma.InputJsonValue,
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка заполнения финансовой таблицы из ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
