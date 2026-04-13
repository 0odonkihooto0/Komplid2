import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// Схема создания заявки на материалы
const createRequestSchema = z.object({
  number: z.string().min(1).max(100).optional(),
  deliveryDate: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
  supplierOrgId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  responsibleId: z.string().uuid().optional(),
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
    const status = req.nextUrl.searchParams.get('status') ?? undefined;
    const from = req.nextUrl.searchParams.get('from') ?? undefined;
    const to = req.nextUrl.searchParams.get('to') ?? undefined;
    const approvalStatus = req.nextUrl.searchParams.get('approvalStatus') ?? undefined;

    const where = {
      projectId: params.projectId,
      ...(status ? { status: status as import('@prisma/client').MaterialRequestStatus } : {}),
      // Фильтрация по дате создания
      ...(from || to ? {
        createdAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      } : {}),
      // Фильтрация по статусу согласования
      ...(approvalStatus === 'none' ? { approvalRouteId: null } : {}),
      ...(approvalStatus && approvalStatus !== 'none' ? {
        approvalRoute: { status: approvalStatus as import('@prisma/client').ApprovalRouteStatus },
      } : {}),
    };

    const [requests, total] = await db.$transaction([
      db.materialRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          // Включаем количество позиций и данные поставщика
          _count: { select: { items: true } },
          supplierOrg: { select: { id: true, name: true } },
          approvalRoute: { select: { status: true } },
        },
      }),
      db.materialRequest.count({ where }),
    ]);

    // Определяем у каких заявок есть позиции без статуса (необработанные)
    const requestIds = requests.map((r) => r.id);
    const unprocessed = requestIds.length > 0
      ? await db.materialRequestItem.findMany({
          where: { requestId: { in: requestIds }, statusId: null },
          select: { requestId: true },
          distinct: ['requestId'],
        })
      : [];
    const unprocessedSet = new Set(unprocessed.map((u) => u.requestId));

    const data = requests.map((r) => ({
      ...r,
      hasUnprocessedItems: unprocessedSet.has(r.id),
      approvalStatus: r.approvalRoute?.status ?? null,
    }));

    return successResponse(data, { total, page, pageSize: limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения списка заявок на материалы');
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

    const body = await req.json();
    const parsed = createRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { number, deliveryDate, notes, supplierOrgId, managerId, responsibleId } = parsed.data;

    // Автогенерация номера если не указан
    const requestNumber = number ?? `LRV-${Date.now()}`;

    const request = await db.materialRequest.create({
      data: {
        number: requestNumber,
        status: 'DRAFT',
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        notes,
        supplierOrgId,
        managerId,
        responsibleId,
        projectId: params.projectId,
        createdById: session.user.id,
      },
      include: {
        _count: { select: { items: true } },
      },
    });

    return successResponse(request);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания заявки на материалы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
