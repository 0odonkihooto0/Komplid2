import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { patchAdditionalCostSchema } from '@/lib/validations/estimate-additional-cost';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; costId: string } };

/** Проверяем принадлежность ДЗ к проекту организации */
async function resolveCost(projectId: string, costId: string, orgId: string) {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId: orgId },
  });
  if (!project) return null;

  const cost = await db.estimateAdditionalCost.findFirst({
    where: { id: costId, projectId },
  });
  return cost;
}

/** GET — одна дополнительная затрата с связями */
export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSessionOrThrow();
    const cost = await resolveCost(params.projectId, params.costId, session.user.organizationId);
    if (!cost) return errorResponse('Дополнительная затрата не найдена', 404);

    const fullCost = await db.estimateAdditionalCost.findUnique({
      where: { id: params.costId },
      include: {
        chapterLinks: true,
        estimateLinks: {
          include: { version: { select: { id: true, name: true } } },
        },
      },
    });

    return successResponse(fullCost);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения дополнительной затраты');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** PATCH — обновить дополнительную затрату */
export async function PATCH(
  req: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSessionOrThrow();
    const cost = await resolveCost(params.projectId, params.costId, session.user.organizationId);
    if (!cost) return errorResponse('Дополнительная затрата не найдена', 404);

    const body = await req.json();
    const parsed = patchAdditionalCostSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { chapterNames, versionIds, ...data } = parsed.data;

    const updated = await db.$transaction(async (tx) => {
      // Обновляем основные поля
      await tx.estimateAdditionalCost.update({
        where: { id: params.costId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.costType !== undefined && { costType: data.costType }),
          ...(data.applicationMode !== undefined && { applicationMode: data.applicationMode }),
          ...(data.level !== undefined && { level: data.level }),
          ...(data.value !== undefined && { value: data.value }),
          ...(data.constructionWorks !== undefined && { constructionWorks: data.constructionWorks }),
          ...(data.mountingWorks !== undefined && { mountingWorks: data.mountingWorks }),
          ...(data.equipment !== undefined && { equipment: data.equipment }),
          ...(data.other !== undefined && { other: data.other }),
          ...(data.calculationMethod !== undefined && { calculationMethod: data.calculationMethod }),
          ...(data.useCustomPrecision !== undefined && { useCustomPrecision: data.useCustomPrecision }),
          ...(data.precision !== undefined && { precision: data.precision }),
        },
      });

      // Пересоздаём связи с главами, если переданы
      if (chapterNames !== undefined) {
        await tx.estimateAdditionalCostChapter.deleteMany({
          where: { additionalCostId: params.costId },
        });
        if (chapterNames.length > 0) {
          await tx.estimateAdditionalCostChapter.createMany({
            data: chapterNames.map((name) => ({
              additionalCostId: params.costId,
              chapterName: name,
            })),
          });
        }
      }

      // Пересоздаём связи со сметами, если переданы
      if (versionIds !== undefined) {
        await tx.estimateAdditionalCostEstimate.deleteMany({
          where: { additionalCostId: params.costId },
        });
        if (versionIds.length > 0) {
          await tx.estimateAdditionalCostEstimate.createMany({
            data: versionIds.map((vid) => ({
              additionalCostId: params.costId,
              versionId: vid,
            })),
          });
        }
      }

      return tx.estimateAdditionalCost.findUnique({
        where: { id: params.costId },
        include: {
          chapterLinks: true,
          estimateLinks: {
            include: { version: { select: { id: true, name: true } } },
          },
        },
      });
    });

    // Проверка VAT level
    const effectiveCostType = data.costType ?? cost.costType;
    const effectiveLevel = data.level ?? cost.level;
    let warning: string | undefined;

    if (effectiveCostType === 'VAT') {
      const maxLevel = await db.estimateAdditionalCost.aggregate({
        where: {
          projectId: params.projectId,
          versionId: cost.versionId,
          id: { not: params.costId },
        },
        _max: { level: true },
      });
      if (maxLevel._max.level && effectiveLevel < maxLevel._max.level) {
        warning = 'НДС обычно применяется последним. Текущий level ниже максимального';
      }
    }

    return successResponse({ ...updated, warning });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления дополнительной затраты');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** DELETE — удалить дополнительную затрату */
export async function DELETE(
  _req: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSessionOrThrow();
    const cost = await resolveCost(params.projectId, params.costId, session.user.organizationId);
    if (!cost) return errorResponse('Дополнительная затрата не найдена', 404);

    await db.estimateAdditionalCost.delete({ where: { id: params.costId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления дополнительной затраты');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
