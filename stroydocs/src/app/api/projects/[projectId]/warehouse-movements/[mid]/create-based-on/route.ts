import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

const bodySchema = z.object({
  targetType: z.enum([
    'RECEIPT', 'SHIPMENT', 'TRANSFER', 'WRITEOFF', 'RETURN',
    'RECEIPT_ORDER', 'EXPENSE_ORDER',
  ] as const),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; mid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем доступ к проекту через organizationId
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
    const { targetType } = parsed.data;

    // Загружаем исходное движение
    const source = await db.warehouseMovement.findFirst({
      where: { id: params.mid, projectId: params.projectId },
      include: { lines: true },
    });
    if (!source) return errorResponse('Движение не найдено', 404);

    // Определяем склады для нового движения
    // Для RETURN — меняем from/to местами (возврат поставщику = to → from)
    let newFromId = source.fromWarehouseId;
    let newToId = source.toWarehouseId;
    if (targetType === 'RETURN') {
      newFromId = source.toWarehouseId;
      newToId = source.fromWarehouseId;
    }

    // Генерируем номер нового документа
    const number = `MOV-${Date.now()}`;

    const newMovement = await db.warehouseMovement.create({
      data: {
        number,
        movementType: targetType,
        status: 'DRAFT',
        movementDate: new Date(),
        projectId: params.projectId,
        createdById: session.user.id,
        fromWarehouseId: newFromId,
        toWarehouseId: newToId,
        consignor: source.consignor,
        consignee: source.consignee,
        vatType: source.vatType,
        vatRate: source.vatRate,
        currency: source.currency,
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
      select: { id: true, number: true },
    });

    return NextResponse.json(successResponse(newMovement), { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
