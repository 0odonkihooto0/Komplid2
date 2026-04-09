import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { catId: string };

// Удалить категорию контракта
export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();

    const category = await db.contractCategory.findFirst({
      where: { id: params.catId, organizationId: session.user.organizationId },
    });
    if (!category) return errorResponse('Категория не найдена', 404);

    // Снять привязку договоров к этой категории перед удалением
    await db.contract.updateMany({
      where: { categoryId: params.catId },
      data: { categoryId: null },
    });

    await db.contractCategory.delete({ where: { id: params.catId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления категории контракта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
