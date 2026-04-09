import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Параметр ganttVersionId обязателен для однозначной выборки задач ГПР
    const ganttVersionId = req.nextUrl.searchParams.get('ganttVersionId');
    if (!ganttVersionId) {
      return errorResponse('Параметр ganttVersionId обязателен', 400);
    }

    // Проверяем что версия ГПР принадлежит данному проекту
    const ganttVersion = await db.ganttVersion.findFirst({
      where: { id: ganttVersionId, projectId: params.projectId },
      select: { id: true, name: true, isActive: true },
    });
    if (!ganttVersion) return errorResponse('Версия ГПР не найдена', 404);

    // Загружаем все задачи версии с видами работ и их материалами
    // Фильтруем только задачи с видами работ — остальные не несут материалов
    const ganttTasks = await db.ganttTask.findMany({
      where: {
        versionId: ganttVersionId,
        workItemId: { not: null },
      },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        planStart: true,
        planEnd: true,
        progress: true,
        status: true,
        workItemId: true,
        workItem: {
          select: {
            id: true,
            name: true,
            unit: true,
            volume: true,
            materials: {
              select: {
                id: true,
                name: true,
                unit: true,
                quantityReceived: true,
                quantityUsed: true,
              },
            },
          },
        },
      },
    });

    // Формируем плоский список: каждый материал — отдельная строка с данными задачи
    // Это упрощает отображение в таблице планирования
    const result = ganttTasks.flatMap((task) => {
      if (!task.workItem) return [];
      return task.workItem.materials.map((material) => ({
        // Данные задачи ГПР
        ganttTaskId: task.id,
        ganttTaskName: task.name,
        planStart: task.planStart,
        planEnd: task.planEnd,
        progress: task.progress,
        taskStatus: task.status,
        // Данные вида работ
        workItemId: task.workItemId,
        workItemName: task.workItem?.name,
        workItemUnit: task.workItem?.unit,
        workItemVolume: task.workItem?.volume,
        // Данные материала
        materialId: material.id,
        materialName: material.name,
        materialUnit: material.unit,
        quantityReceived: material.quantityReceived,
        quantityUsed: material.quantityUsed,
        // Расчётный остаток (сколько ещё нужно заказать)
        quantityRemaining: Math.max(0, material.quantityReceived - material.quantityUsed),
      }));
    });

    return successResponse({
      ganttVersion,
      materials: result,
      total: result.length,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения материалов из ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
