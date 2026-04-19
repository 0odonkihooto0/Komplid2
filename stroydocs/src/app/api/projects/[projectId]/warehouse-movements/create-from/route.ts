import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  sourceType: z.enum(['SUPPLIER_ORDER', 'WAREHOUSE_MOVEMENT']),
  sourceId: z.string().uuid(),
  targetType: z.enum([
    'RECEIPT', 'SHIPMENT', 'TRANSFER', 'WRITEOFF', 'RETURN',
    'RECEIPT_ORDER', 'EXPENSE_ORDER',
  ] as const),
});

// Префиксы номеров документов по типу движения
const NUMBER_PREFIX: Record<string, string> = {
  RECEIPT:       'RECEIPT',
  SHIPMENT:      'SHIP',
  TRANSFER:      'TRANS',
  WRITEOFF:      'WRITE',
  RETURN:        'RET',
  RECEIPT_ORDER: 'ORD-IN',
  EXPENSE_ORDER: 'ORD-OUT',
};

/**
 * POST /api/projects/[projectId]/warehouse-movements/create-from
 * Единый endpoint «Создать на основании» для складских документов.
 *
 * sourceType=SUPPLIER_ORDER — копирует позиции из заказа поставщику,
 *   заполняет склад/контрагентов из реквизитов заказа.
 * sourceType=WAREHOUSE_MOVEMENT — копирует позиции из существующего движения
 *   (аналог create-based-on, для RETURN меняет from/to местами).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации (multi-tenancy)
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const body = await req.json() as unknown;
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { sourceType, sourceId, targetType } = parsed.data;

    const number = `${NUMBER_PREFIX[targetType]}-${Date.now()}`;

    if (sourceType === 'SUPPLIER_ORDER') {
      return await createFromSupplierOrder(params.projectId, sourceId, targetType, number, session.user.id);
    } else {
      return await createFromMovement(params.projectId, sourceId, targetType, number, session.user.id);
    }
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания документа create-from');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/**
 * Создание складского движения на основании заказа поставщику.
 * Копирует позиции заказа и заполняет реквизиты из контрагентов заказа.
 */
async function createFromSupplierOrder(
  projectId: string,
  orderId: string,
  targetType: string,
  number: string,
  createdById: string,
) {
  const order = await db.supplierOrder.findFirst({
    where: { id: orderId, projectId },
    include: {
      items: {
        include: {
          nomenclature: { select: { id: true, name: true, unit: true } },
        },
      },
      supplierOrg: { select: { id: true, name: true } },
      customerOrg: { select: { id: true, name: true } },
    },
  });
  if (!order) return errorResponse('Заказ поставщику не найден', 404);

  // Определяем направление склада по типу нового документа
  let fromWarehouseId: string | null = null;
  let toWarehouseId: string | null = null;

  if (targetType === 'RECEIPT' || targetType === 'RECEIPT_ORDER') {
    // Поступление/приходный ордер — товар приходит на склад
    toWarehouseId = order.warehouseId ?? null;
  } else if (
    targetType === 'SHIPMENT' ||
    targetType === 'WRITEOFF' ||
    targetType === 'EXPENSE_ORDER'
  ) {
    // Отгрузка/списание/расходный ордер — товар уходит со склада
    fromWarehouseId = order.warehouseId ?? null;
  } else {
    // TRANSFER, RETURN — перемещение/возврат: склад-источник из заказа
    fromWarehouseId = order.warehouseId ?? null;
  }

  // Грузоотправитель и грузополучатель из контрагентов заказа
  const supplierName = order.supplierOrg?.name ?? null;
  const customerName = order.customerOrg?.name ?? null;
  // Для поступлений: грузоотправитель = поставщик, грузополучатель = заказчик
  // Для отгрузок: наоборот
  const isIncoming = targetType === 'RECEIPT' || targetType === 'RECEIPT_ORDER';
  const consignor = isIncoming ? supplierName : customerName;
  const consignee = isIncoming ? customerName : supplierName;

  const newMovement = await db.warehouseMovement.create({
    data: {
      number,
      movementType: targetType as 'RECEIPT' | 'SHIPMENT' | 'TRANSFER' | 'WRITEOFF' | 'RETURN' | 'RECEIPT_ORDER' | 'EXPENSE_ORDER',
      status: 'DRAFT',
      movementDate: new Date(),
      projectId,
      createdById,
      orderId: order.id,
      fromWarehouseId,
      toWarehouseId,
      ...(consignor ? { consignor } : {}),
      ...(consignee ? { consignee } : {}),
      // Линии движения из позиций заказа
      lines: {
        create: order.items.map((item) => ({
          nomenclatureId: item.nomenclatureId ?? undefined,
          quantity: item.quantity,
          unit: item.unit ?? undefined,
          unitPrice: item.unitPrice ?? undefined,
          totalPrice: item.totalPrice ?? undefined,
          lineVatRate: item.vatRate ?? undefined,
          vatAmount: item.vatAmount ?? undefined,
          discount: item.discount ?? undefined,
          // Проставляем «Основание» — номер исходного заказа
          basis: order.number ?? undefined,
        })),
      },
    },
    select: { id: true, number: true, movementType: true },
  });

  return NextResponse.json(successResponse(newMovement), { status: 201 });
}

/**
 * Создание складского движения на основании существующего движения.
 * Для RETURN — меняет склад-источник и склад-получатель местами.
 */
async function createFromMovement(
  projectId: string,
  sourceMovementId: string,
  targetType: string,
  number: string,
  createdById: string,
) {
  const source = await db.warehouseMovement.findFirst({
    where: { id: sourceMovementId, projectId },
    include: { lines: true },
  });
  if (!source) return errorResponse('Складское движение не найдено', 404);

  // Для возврата меняем склад-источник и склад-назначения местами
  let newFromId = source.fromWarehouseId;
  let newToId = source.toWarehouseId;
  if (targetType === 'RETURN') {
    newFromId = source.toWarehouseId;
    newToId = source.fromWarehouseId;
  }

  const newMovement = await db.warehouseMovement.create({
    data: {
      number,
      movementType: targetType as 'RECEIPT' | 'SHIPMENT' | 'TRANSFER' | 'WRITEOFF' | 'RETURN' | 'RECEIPT_ORDER' | 'EXPENSE_ORDER',
      status: 'DRAFT',
      movementDate: new Date(),
      projectId,
      createdById,
      fromWarehouseId: newFromId,
      toWarehouseId: newToId,
      consignor: source.consignor,
      consignee: source.consignee,
      vatType: source.vatType,
      vatRate: source.vatRate,
      currency: source.currency,
      currencyId: source.currencyId,
      lines: {
        create: source.lines.map((line) => ({
          nomenclatureId: line.nomenclatureId,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
          totalPrice: line.totalPrice,
          vatAmount: line.vatAmount,
          totalWithVat: line.totalWithVat,
          lineVatRate: line.lineVatRate,
          discount: line.discount,
          basis: line.basis,
          gtd: line.gtd,
          country: line.country,
          comment: line.comment,
          recipientAddress: line.recipientAddress,
        })),
      },
    },
    select: { id: true, number: true, movementType: true },
  });

  return NextResponse.json(successResponse(newMovement), { status: 201 });
}
