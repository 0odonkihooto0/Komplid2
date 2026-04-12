import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { createAdditionalCostSchema } from '@/lib/validations/estimate-additional-cost';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; contractId: string; versionId: string } };

/** Проверяем цепочку: проект → контракт → версия */
async function resolveVersion(projectId: string, contractId: string, versionId: string, orgId: string) {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId: orgId },
  });
  if (!project) return null;

  const version = await db.estimateVersion.findFirst({
    where: { id: versionId, contractId },
  });
  return version;
}

/** GET — дополнительные затраты привязанные к версии сметы */
export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSessionOrThrow();
    const version = await resolveVersion(
      params.projectId, params.contractId, params.versionId, session.user.organizationId
    );
    if (!version) return errorResponse('Версия сметы не найдена', 404);

    // ДЗ привязанные напрямую к версии (индивидуальные)
    const versionCosts = await db.estimateAdditionalCost.findMany({
      where: { versionId: params.versionId, projectId: params.projectId },
      include: {
        chapterLinks: true,
        estimateLinks: {
          include: { version: { select: { id: true, name: true } } },
        },
      },
      orderBy: { level: 'asc' },
    });

    // Общие ДЗ объекта, привязанные к этой версии через estimateLinks
    const linkedCosts = await db.estimateAdditionalCost.findMany({
      where: {
        projectId: params.projectId,
        versionId: null,
        estimateLinks: { some: { versionId: params.versionId } },
      },
      include: {
        chapterLinks: true,
        estimateLinks: {
          include: { version: { select: { id: true, name: true } } },
        },
      },
      orderBy: { level: 'asc' },
    });

    return successResponse({ versionCosts, linkedCosts });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения ДЗ версии сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST — создать ДЗ для конкретной версии сметы */
export async function POST(
  req: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSessionOrThrow();
    const version = await resolveVersion(
      params.projectId, params.contractId, params.versionId, session.user.organizationId
    );
    if (!version) return errorResponse('Версия сметы не найдена', 404);

    const body = await req.json();
    const parsed = createAdditionalCostSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { chapterNames, versionIds, ...data } = parsed.data;

    const cost = await db.$transaction(async (tx) => {
      const created = await tx.estimateAdditionalCost.create({
        data: {
          ...data,
          projectId: params.projectId,
          versionId: params.versionId,
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

      // Привязка к версиям смет (для cross-version ссылок)
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

    // Проверка VAT level
    let warning: string | undefined;
    if (data.costType === 'VAT') {
      const maxLevel = await db.estimateAdditionalCost.aggregate({
        where: { projectId: params.projectId, versionId: params.versionId },
        _max: { level: true },
      });
      if (maxLevel._max.level && data.level < maxLevel._max.level) {
        warning = 'НДС обычно применяется последним. Текущий level ниже максимального';
      }
    }

    return successResponse({ ...cost, warning });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания ДЗ версии сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
