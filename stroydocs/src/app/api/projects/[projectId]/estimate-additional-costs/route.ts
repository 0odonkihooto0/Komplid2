import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { createAdditionalCostSchema } from '@/lib/validations/estimate-additional-cost';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string } };

/** GET — общие дополнительные затраты объекта (не привязанные к конкретной смете) */
export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const costs = await db.estimateAdditionalCost.findMany({
      where: { projectId: params.projectId, versionId: null },
      include: {
        chapterLinks: true,
        estimateLinks: {
          include: {
            version: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { level: 'asc' },
    });

    return successResponse(costs);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения дополнительных затрат объекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST — создать общую дополнительную затрату объекта */
export async function POST(
  req: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createAdditionalCostSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { chapterNames, versionIds, ...data } = parsed.data;

    // Создаём ДЗ + связи в транзакции
    const cost = await db.$transaction(async (tx) => {
      const created = await tx.estimateAdditionalCost.create({
        data: {
          ...data,
          projectId: params.projectId,
          versionId: null,
          value: data.value ?? null,
          constructionWorks: data.constructionWorks ?? null,
          mountingWorks: data.mountingWorks ?? null,
          equipment: data.equipment ?? null,
          other: data.other ?? null,
          precision: data.precision ?? null,
        },
      });

      // Привязка к главам
      if (chapterNames.length > 0) {
        await tx.estimateAdditionalCostChapter.createMany({
          data: chapterNames.map((name) => ({
            additionalCostId: created.id,
            chapterName: name,
          })),
        });
      }

      // Привязка к версиям смет
      if (versionIds.length > 0) {
        await tx.estimateAdditionalCostEstimate.createMany({
          data: versionIds.map((vid) => ({
            additionalCostId: created.id,
            versionId: vid,
          })),
        });
      }

      return tx.estimateAdditionalCost.findUnique({
        where: { id: created.id },
        include: {
          chapterLinks: true,
          estimateLinks: {
            include: { version: { select: { id: true, name: true } } },
          },
        },
      });
    });

    // Проверка VAT: level должен быть максимальным
    let warning: string | undefined;
    if (data.costType === 'VAT') {
      const maxLevel = await db.estimateAdditionalCost.aggregate({
        where: { projectId: params.projectId, versionId: null },
        _max: { level: true },
      });
      if (maxLevel._max.level && data.level < maxLevel._max.level) {
        warning = 'НДС обычно применяется последним. Текущий level ниже максимального';
      }
    }

    return successResponse({ ...cost, warning });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания дополнительной затраты');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
