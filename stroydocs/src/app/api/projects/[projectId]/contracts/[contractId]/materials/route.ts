import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { createMaterialSchema } from '@/lib/validations/material';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const url = req.nextUrl;
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50')));
    const skip = (page - 1) * limit;

    const [materials, total] = await Promise.all([
      db.material.findMany({
        where: { contractId: params.contractId },
        include: {
          _count: { select: { documents: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.material.count({ where: { contractId: params.contractId } }),
    ]);

    // Добавляем вычисляемые поля
    const result = materials.map((m) => ({
      ...m,
      remaining: m.quantityReceived - m.quantityUsed,
      hasCertificate: m._count.documents > 0,
    }));

    return successResponse({ data: result, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения материалов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createMaterialSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { invoiceDate, ...rest } = parsed.data;

    const material = await db.material.create({
      data: {
        ...rest,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
        contractId: params.contractId,
      },
    });

    return successResponse(material);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания материала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
