import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { SupplierOrderStatus, SupplierOrderType } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Условия поставки по Incoterms
const DELIVERY_CONDITIONS = ['NONE', 'EXW', 'FOB', 'CIF', 'DAP'] as const;

// Схема обновления заказа — все поля опциональны
const updateOrderSchema = z.object({
  status: z.nativeEnum(SupplierOrderStatus).optional(),
  type: z.nativeEnum(SupplierOrderType).optional(),
  deliveryDate: z.string().datetime().optional().nullable(),
  totalAmount: z.number().nonnegative().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  supplierOrgId: z.string().uuid().optional().nullable(),
  customerOrgId: z.string().uuid().optional().nullable(),
  warehouseId: z.string().uuid().optional().nullable(),
  // Расширенные поля ЦУС
  externalNumber: z.string().max(100).optional().nullable(),
  expectedReadyDate: z.string().datetime().optional().nullable(),
  expectedArrivalDate: z.string().datetime().optional().nullable(),
  readinessCorrectionDate: z.string().datetime().optional().nullable(),
  underdeliveryDate: z.string().datetime().optional().nullable(),
  readinessThrough: z.string().max(100).optional().nullable(),
  deliveryConditions: z.enum(DELIVERY_CONDITIONS).optional().nullable(),
  contractType: z.string().max(200).optional().nullable(),
  constructionObject: z.string().max(500).optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; oid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Получение заказа со всеми связями
    const order = await db.supplierOrder.findFirst({
      where: { id: params.oid, projectId: params.projectId },
      include: {
        items: {
          include: {
            nomenclature: { select: { id: true, name: true, unit: true } },
          },
        },
        movements: {
          select: {
            id: true,
            number: true,
            movementType: true,
            status: true,
            movementDate: true,
          },
        },
        supplierOrg: { select: { id: true, name: true } },
        customerOrg: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        request: { select: { id: true, number: true, status: true } },
        // Маршрут согласования
        approvalRoute: {
          include: {
            steps: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
              orderBy: { stepIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!order) return errorResponse('Заказ не найден', 404);

    return successResponse(order);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения заказа поставщику');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; oid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Проверка принадлежности заказа проекту
    const existing = await db.supplierOrder.findFirst({
      where: { id: params.oid, projectId: params.projectId },
      select: { id: true },
    });
    if (!existing) return errorResponse('Заказ не найден', 404);

    const body = await req.json() as unknown;
    const parsed = updateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const data = parsed.data;

    const updated = await db.supplierOrder.update({
      where: { id: params.oid },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.deliveryDate !== undefined
          ? { deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null }
          : {}),
        ...(data.totalAmount !== undefined ? { totalAmount: data.totalAmount } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.supplierOrgId !== undefined ? { supplierOrgId: data.supplierOrgId } : {}),
        ...(data.customerOrgId !== undefined ? { customerOrgId: data.customerOrgId } : {}),
        ...(data.warehouseId !== undefined ? { warehouseId: data.warehouseId } : {}),
        ...(data.externalNumber !== undefined ? { externalNumber: data.externalNumber } : {}),
        ...(data.expectedReadyDate !== undefined
          ? { expectedReadyDate: data.expectedReadyDate ? new Date(data.expectedReadyDate) : null }
          : {}),
        ...(data.expectedArrivalDate !== undefined
          ? { expectedArrivalDate: data.expectedArrivalDate ? new Date(data.expectedArrivalDate) : null }
          : {}),
        ...(data.readinessCorrectionDate !== undefined
          ? { readinessCorrectionDate: data.readinessCorrectionDate ? new Date(data.readinessCorrectionDate) : null }
          : {}),
        ...(data.underdeliveryDate !== undefined
          ? { underdeliveryDate: data.underdeliveryDate ? new Date(data.underdeliveryDate) : null }
          : {}),
        ...(data.readinessThrough !== undefined ? { readinessThrough: data.readinessThrough } : {}),
        ...(data.deliveryConditions !== undefined ? { deliveryConditions: data.deliveryConditions } : {}),
        ...(data.contractType !== undefined ? { contractType: data.contractType } : {}),
        ...(data.constructionObject !== undefined ? { constructionObject: data.constructionObject } : {}),
      },
      include: {
        items: {
          include: {
            nomenclature: { select: { id: true, name: true, unit: true } },
          },
        },
        supplierOrg: { select: { id: true, name: true } },
        customerOrg: { select: { id: true, name: true } },
        request: { select: { id: true, number: true, status: true } },
        approvalRoute: {
          include: {
            steps: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
              orderBy: { stepIndex: 'asc' },
            },
          },
        },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления заказа поставщику');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; oid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const existing = await db.supplierOrder.findFirst({
      where: { id: params.oid, projectId: params.projectId },
      select: { id: true, status: true },
    });
    if (!existing) return errorResponse('Заказ не найден', 404);

    // Удалять можно только черновики
    if (existing.status !== 'DRAFT') {
      return errorResponse('Удалить можно только заказ в статусе «Черновик»', 409);
    }

    await db.supplierOrder.delete({ where: { id: params.oid } });

    return successResponse({ id: params.oid });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления заказа поставщику');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
