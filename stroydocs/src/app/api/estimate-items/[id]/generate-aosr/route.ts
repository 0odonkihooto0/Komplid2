import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { requireFeature } from '@/lib/subscriptions/require-feature';
import { FEATURES } from '@/lib/subscriptions/features';
import { classifyExecutionDoc } from '@/lib/id-classification';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Загружаем позицию сметы с полной цепочкой до воркспейса
    const item = await db.estimateItem.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        unit: true,
        volume: true,
        chapter: {
          select: {
            version: {
              select: {
                contractId: true,
                contract: {
                  select: {
                    id: true,
                    buildingObject: {
                      select: {
                        id: true,
                        workspaceId: true,
                        workspace: {
                          select: {
                            id: true,
                            type: true,
                            members: { select: { userId: true } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!item) return errorResponse('Позиция сметы не найдена', 404);

    const contract = item.chapter.version.contract;
    const buildingObject = contract.buildingObject;
    const workspace = buildingObject.workspace;

    // Проверяем принадлежность к воркспейсу
    if (
      !workspace ||
      !workspace.members.some((m) => m.userId === session.user.id)
    ) {
      return errorResponse('Нет доступа', 403);
    }

    // Feature gate
    await requireFeature(workspace.id, FEATURES.AOSR_GENERATION);

    // Авто-нумерация АОСР в рамках контракта
    const count = await db.executionDoc.count({
      where: { contractId: contract.id, type: 'AOSR' },
    });
    const number = `АОСР-${String(count + 1).padStart(3, '0')}`;

    // Предзаполнение: для PERSONAL workspace скрываем поля автонадзора
    const overrideFields =
      workspace.type === 'PERSONAL'
        ? { hideAutonadzor: true, hideTechnadzor: true }
        : null;

    const doc = await db.executionDoc.create({
      data: {
        type: 'AOSR',
        number,
        title: item.name,
        contractId: contract.id,
        createdById: session.user.id,
        idCategory: classifyExecutionDoc('AOSR'),
        factVolume: item.volume ?? null,
        overrideFields: overrideFields as never,
      },
      select: {
        id: true,
        type: true,
        number: true,
        title: true,
        status: true,
        contractId: true,
        createdAt: true,
        contract: {
          select: {
            buildingObject: { select: { id: true } },
          },
        },
      },
    });

    return successResponse({
      docId: doc.id,
      contractId: doc.contractId,
      projectId: doc.contract.buildingObject.id,
      number: doc.number,
      title: doc.title,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    logger.error({ err: error }, 'Ошибка генерации АОСР из позиции сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
