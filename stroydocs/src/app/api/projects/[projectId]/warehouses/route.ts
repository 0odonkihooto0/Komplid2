import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// Схема создания склада
const createWarehouseSchema = z.object({
  name: z.string().min(1).max(200),
  location: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
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

    // Склады объекта с количеством уникальных номенклатур
    const warehouses = await db.warehouse.findMany({
      where: { projectId: params.projectId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    return successResponse(warehouses);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения списка складов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

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

    const body = await req.json() as unknown;
    const parsed = createWarehouseSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { name, location, isDefault } = parsed.data;

    let warehouse;

    if (isDefault) {
      // При установке isDefault=true — сбросить флаг у всех остальных складов объекта
      warehouse = await db.$transaction(async (tx) => {
        await tx.warehouse.updateMany({
          where: { projectId: params.projectId, isDefault: true },
          data: { isDefault: false },
        });

        return tx.warehouse.create({
          data: {
            name,
            projectId: params.projectId,
            isDefault: true,
            ...(location ? { location } : {}),
          },
          include: {
            _count: { select: { items: true } },
          },
        });
      });
    } else {
      warehouse = await db.warehouse.create({
        data: {
          name,
          projectId: params.projectId,
          isDefault: false,
          ...(location ? { location } : {}),
        },
        include: {
          _count: { select: { items: true } },
        },
      });
    }

    return successResponse(warehouse);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания склада');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
