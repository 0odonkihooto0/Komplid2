import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// Схема создания заявки на материалы из задач ГПР
const fromGprSchema = z.object({
  ganttVersionId: z.string().uuid('Некорректный ID версии ГПР'),
  ganttTaskIds: z.array(z.string().uuid()).min(1, 'Необходимо выбрать хотя бы одну задачу'),
  notes: z.string().max(2000).optional(),
});

export async function POST(
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

    const body = await req.json();
    const parsed = fromGprSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { ganttVersionId, ganttTaskIds, notes } = parsed.data;

    // Проверяем что версия ГПР принадлежит данному проекту
    const ganttVersion = await db.ganttVersion.findFirst({
      where: { id: ganttVersionId, projectId: params.projectId },
      select: { id: true },
    });
    if (!ganttVersion) return errorResponse('Версия ГПР не найдена', 404);

    // Загружаем задачи ГПР с привязанными видами работ и их материалами
    const ganttTasks = await db.ganttTask.findMany({
      where: {
        id: { in: ganttTaskIds },
        versionId: ganttVersionId,
      },
      include: {
        workItem: {
          include: {
            // Материалы вида работ — нужны для расчёта остатков
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

    if (ganttTasks.length === 0) {
      return errorResponse('Выбранные задачи ГПР не найдены', 404);
    }

    // Собираем позиции для заявки: одна позиция на каждый материал каждой задачи
    // Количество = max(0, получено - использовано) — остаток к заказу
    const itemsToCreate: Array<{
      materialId: string;
      quantity: number;
      unit: string | null;
      ganttTaskId: string;
    }> = [];

    for (const task of ganttTasks) {
      if (!task.workItem) continue;
      for (const material of task.workItem.materials) {
        const remaining = Math.max(0, material.quantityReceived - material.quantityUsed);
        itemsToCreate.push({
          materialId: material.id,
          quantity: remaining > 0 ? remaining : 1, // минимум 1 если нет остатка
          unit: material.unit ?? null,
          ganttTaskId: task.id,
        });
      }
    }

    // Создаём заявку и все её позиции в одной транзакции
    const request = await db.materialRequest.create({
      data: {
        number: `LRV-${Date.now()}`,
        status: 'DRAFT',
        notes,
        projectId: params.projectId,
        createdById: session.user.id,
        items: {
          create: itemsToCreate,
        },
      },
      include: {
        items: {
          include: {
            material: {
              select: { id: true, name: true, unit: true },
            },
          },
        },
        _count: { select: { items: true } },
      },
    });

    return successResponse(request);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания заявки на материалы из ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
