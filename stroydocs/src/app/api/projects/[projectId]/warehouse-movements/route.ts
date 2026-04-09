import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { WarehouseMovementType, WarehouseMovStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Схема строки движения
const movementLineSchema = z.object({
  nomenclatureId: z.string().uuid().optional(),
  quantity: z.number().positive(),
  unit: z.string().max(50).optional(),
  unitPrice: z.number().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
});

// Схема создания складского движения
const createMovementSchema = z.object({
  movementType: z.nativeEnum(WarehouseMovementType),
  fromWarehouseId: z.string().uuid().optional(),
  toWarehouseId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  movementDate: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
  lines: z.array(movementLineSchema).optional(),
});

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

    const page = Number(req.nextUrl.searchParams.get('page') ?? 1);
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 50), 200);
    const skip = (page - 1) * limit;

    // Опциональные фильтры по типу и статусу движения
    const movementTypeParam = req.nextUrl.searchParams.get('movementType');
    const statusParam = req.nextUrl.searchParams.get('status');

    const where = {
      projectId: params.projectId,
      ...(movementTypeParam ? { movementType: movementTypeParam as WarehouseMovementType } : {}),
      ...(statusParam ? { status: statusParam as WarehouseMovStatus } : {}),
    };

    const [data, total] = await db.$transaction([
      db.warehouseMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { movementDate: 'desc' },
        include: {
          fromWarehouse: { select: { id: true, name: true } },
          toWarehouse: { select: { id: true, name: true } },
          _count: { select: { lines: true } },
        },
      }),
      db.warehouseMovement.count({ where }),
    ]);

    return successResponse(data, { total, page, pageSize: limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения списка складских движений');
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
    const parsed = createMovementSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const {
      movementType,
      fromWarehouseId,
      toWarehouseId,
      orderId,
      movementDate,
      notes,
      lines,
    } = parsed.data;

    // Бизнес-валидация: проверка обязательных складов по типу движения
    if (movementType === 'TRANSFER') {
      if (!fromWarehouseId || !toWarehouseId) {
        return errorResponse('Для перемещения необходимо указать склад-источник и склад-назначение', 400);
      }
    } else if (movementType === 'RECEIPT') {
      if (!toWarehouseId) {
        return errorResponse('Для поступления необходимо указать склад-назначение', 400);
      }
    } else if (
      movementType === 'WRITEOFF' ||
      movementType === 'SHIPMENT' ||
      movementType === 'RETURN'
    ) {
      if (!fromWarehouseId) {
        return errorResponse('Для данного типа движения необходимо указать склад-источник', 400);
      }
    }

    // Автогенерация номера документа
    const number = `MOV-${Date.now()}`;

    const movement = await db.warehouseMovement.create({
      data: {
        number,
        movementType,
        status: 'DRAFT',
        projectId: params.projectId,
        createdById: session.user.id,
        ...(fromWarehouseId ? { fromWarehouseId } : {}),
        ...(toWarehouseId ? { toWarehouseId } : {}),
        ...(orderId ? { orderId } : {}),
        ...(movementDate ? { movementDate: new Date(movementDate) } : {}),
        ...(notes ? { notes } : {}),
        // Создание строк движения вложенным запросом
        ...(lines && lines.length > 0
          ? {
              lines: {
                createMany: {
                  data: lines.map((line) => ({
                    quantity: line.quantity,
                    unit: line.unit,
                    unitPrice: line.unitPrice,
                    totalPrice:
                      line.unitPrice !== undefined
                        ? line.quantity * line.unitPrice
                        : undefined,
                    notes: line.notes,
                    nomenclatureId: line.nomenclatureId,
                  })),
                },
              },
            }
          : {}),
      },
      include: {
        lines: {
          include: {
            nomenclature: { select: { id: true, name: true, unit: true } },
          },
        },
        fromWarehouse: { select: { id: true, name: true } },
        toWarehouse: { select: { id: true, name: true } },
        _count: { select: { lines: true } },
      },
    });

    return successResponse(movement);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания складского движения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
