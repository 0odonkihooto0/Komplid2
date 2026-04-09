import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { SupplierOrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Схема позиции заказа поставщику
const orderItemSchema = z.object({
  nomenclatureId: z.string().uuid().optional(),
  quantity: z.number().positive(),
  unit: z.string().max(50).optional(),
  unitPrice: z.number().nonnegative().optional(),
});

// Схема создания заказа поставщику
const createOrderSchema = z.object({
  number: z.string().min(1).max(100).optional(),
  supplierOrgId: z.string().uuid().optional(),
  customerOrgId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  requestId: z.string().uuid().optional(),
  deliveryDate: z.string().datetime().optional(),
  totalAmount: z.number().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(orderItemSchema).optional(),
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

    // Опциональный фильтр по статусу заказа
    const statusParam = req.nextUrl.searchParams.get('status');
    const where = {
      projectId: params.projectId,
      ...(statusParam ? { status: statusParam as SupplierOrderStatus } : {}),
    };

    const [data, total] = await db.$transaction([
      db.supplierOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          // Количество позиций и наименование поставщика
          _count: { select: { items: true } },
          supplierOrg: { select: { name: true } },
        },
      }),
      db.supplierOrder.count({ where }),
    ]);

    return successResponse(data, { total, page, pageSize: limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения списка заказов поставщику');
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
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const {
      number,
      supplierOrgId,
      customerOrgId,
      warehouseId,
      requestId,
      deliveryDate,
      totalAmount,
      notes,
      items,
    } = parsed.data;

    // Автогенерация номера заказа если не передан
    const orderNumber = number ?? `ORDER-${Date.now()}`;

    const order = await db.supplierOrder.create({
      data: {
        number: orderNumber,
        status: 'DRAFT',
        projectId: params.projectId,
        createdById: session.user.id,
        ...(supplierOrgId ? { supplierOrgId } : {}),
        ...(customerOrgId ? { customerOrgId } : {}),
        ...(warehouseId ? { warehouseId } : {}),
        ...(requestId ? { requestId } : {}),
        ...(deliveryDate ? { deliveryDate: new Date(deliveryDate) } : {}),
        ...(totalAmount !== undefined ? { totalAmount } : {}),
        ...(notes ? { notes } : {}),
        // Создание позиций заказа вложенным запросом
        ...(items && items.length > 0
          ? {
              items: {
                createMany: {
                  data: items.map((item) => ({
                    nomenclatureId: item.nomenclatureId,
                    quantity: item.quantity,
                    unit: item.unit,
                    unitPrice: item.unitPrice,
                    totalPrice:
                      item.unitPrice !== undefined
                        ? item.quantity * item.unitPrice
                        : undefined,
                  })),
                },
              },
            }
          : {}),
      },
      include: {
        items: {
          include: { nomenclature: { select: { name: true } } },
        },
        supplierOrg: { select: { name: true } },
      },
    });

    return successResponse(order);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания заказа поставщику');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
