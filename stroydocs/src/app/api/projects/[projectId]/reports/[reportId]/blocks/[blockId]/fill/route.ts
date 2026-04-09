import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { autoFillBlock } from '@/lib/reports/auto-fill-block';

export const dynamic = 'force-dynamic';

interface Params { projectId: string; reportId: string; blockId: string }

/** POST /api/projects/[projectId]/reports/[reportId]/blocks/[blockId]/fill
 *  Автозаполнение блока данными из соответствующих моделей */
export async function POST(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId, reportId, blockId } = params;

    // Проверяем доступ к проекту
    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Загружаем блок вместе с данными отчёта (период нужен для фильтрации)
    const block = await db.reportBlock.findFirst({
      where: { id: blockId, reportId, report: { projectId } },
      include: {
        report: { select: { periodStart: true, periodEnd: true } },
      },
    });
    if (!block) return errorResponse('Блок не найден', 404);

    // Выполняем автозаполнение по типу блока
    const filledContent = await autoFillBlock(block, projectId, block.report);

    // Сохраняем результат и помечаем блок как автозаполненный
    const updated = await db.reportBlock.update({
      where: { id: blockId },
      data: {
        content: filledContent as Prisma.InputJsonValue,
        isAutoFilled: true,
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка автозаполнения блока отчёта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
