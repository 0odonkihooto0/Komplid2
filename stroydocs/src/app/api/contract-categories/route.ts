import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const createCategorySchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(100),
  trackPayments: z.boolean().optional().default(true),
});

// Получить список категорий контрактов организации
export async function GET() {
  try {
    const session = await getSessionOrThrow();

    const categories = await db.contractCategory.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { contracts: true } },
      },
    });

    return successResponse(categories);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения категорий контрактов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Создать новую категорию контрактов
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();

    const body = await req.json();
    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    // Определяем порядок новой категории
    const maxOrder = await db.contractCategory.aggregate({
      where: { organizationId: session.user.organizationId },
      _max: { order: true },
    });

    const category = await db.contractCategory.create({
      data: {
        ...parsed.data,
        order: (maxOrder._max.order ?? 0) + 1,
        organizationId: session.user.organizationId,
      },
      include: {
        _count: { select: { contracts: true } },
      },
    });

    return successResponse(category);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания категории контракта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
