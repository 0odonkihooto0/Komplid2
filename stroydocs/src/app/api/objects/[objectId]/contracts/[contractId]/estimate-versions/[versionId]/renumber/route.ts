import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** POST — перенумеровать все позиции версии сметы последовательно (1, 2, 3...) */
export async function POST(
  _req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; versionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const version = await db.estimateVersion.findFirst({
      where: { id: params.versionId, contractId: params.contractId },
    });
    if (!version) return errorResponse('Версия не найдена', 404);

    if (version.isBaseline) {
      return errorResponse('Нельзя изменять базовую версию (Baseline)', 400);
    }

    // Загружаем все активные позиции с порядком глав для правильной сортировки
    const items = await db.estimateItem.findMany({
      where: {
        chapter: { versionId: params.versionId },
        isDeleted: false,
      },
      select: { id: true, sortOrder: true, chapter: { select: { order: true } } },
      orderBy: [
        { chapter: { order: 'asc' } },
        { sortOrder: 'asc' },
      ],
    });

    // Перенумеровываем последовательно: 1, 2, 3...
    await db.$transaction(
      items.map((item, index) =>
        db.estimateItem.update({
          where: { id: item.id },
          data: { sortOrder: index + 1 },
        })
      )
    );

    return successResponse({ renumbered: items.length });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка перенумерации позиций сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
