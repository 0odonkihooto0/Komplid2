import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; contractId: string; ks2Id: string } };

const updateKs2Schema = z.object({
  status: z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED']).optional(),
  items: z.array(z.object({
    id: z.string().optional(),
    sortOrder: z.number().int(),
    name: z.string().min(1),
    unit: z.string().min(1),
    volume: z.number(),
    unitPrice: z.number(),
    totalPrice: z.number(),
    laborCost: z.number().default(0),
    materialCost: z.number().default(0),
    workItemId: z.string().optional().nullable(),
  })).optional(),
  excludedAdditionalCostIds: z.array(z.string()).optional(),
  correctionToKs2Id: z.string().nullable().optional(),
});

/** GET — детали акта КС-2 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const act = await db.ks2Act.findFirst({
      where: { id: params.ks2Id, contractId: params.contractId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            workItem: { select: { id: true, name: true, projectCipher: true } },
          },
        },
        ks3Certificate: true,
        contract: {
          select: {
            number: true,
            buildingObject: { select: { name: true, address: true } },
          },
        },
      },
    });

    if (!act) return errorResponse('Акт КС-2 не найден', 404);

    return successResponse(act);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения акта КС-2');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** PATCH — обновить акт КС-2 (статус + позиции) */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const act = await db.ks2Act.findFirst({
      where: { id: params.ks2Id, contractId: params.contractId },
    });
    if (!act) return errorResponse('Акт КС-2 не найден', 404);

    const body = await req.json();
    const parsed = updateKs2Schema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { status, items, excludedAdditionalCostIds, correctionToKs2Id } = parsed.data;

    // Обновляем позиции если переданы
    if (items !== undefined) {
      // Удалить старые позиции и пересоздать
      await db.ks2Item.deleteMany({ where: { ks2ActId: params.ks2Id } });

      const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);
      const laborCostTotal = items.reduce((sum, i) => sum + i.laborCost, 0);
      const materialCostTotal = items.reduce((sum, i) => sum + i.materialCost, 0);

      await db.ks2Act.update({
        where: { id: params.ks2Id },
        data: {
          ...(status && { status }),
          ...(excludedAdditionalCostIds !== undefined && { excludedAdditionalCostIds }),
          ...(correctionToKs2Id !== undefined && { correctionToKs2Id }),
          totalAmount,
          laborCost: laborCostTotal,
          materialCost: materialCostTotal,
          items: {
            create: items.map((item) => ({
              sortOrder: item.sortOrder,
              name: item.name,
              unit: item.unit,
              volume: item.volume,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              laborCost: item.laborCost,
              materialCost: item.materialCost,
              workItemId: item.workItemId || null,
            })),
          },
        },
      });
    } else {
      // Обновляем статус и/или поля ДЗ/корректировки
      const hasUpdate = status || excludedAdditionalCostIds !== undefined || correctionToKs2Id !== undefined;
      if (hasUpdate) {
        await db.ks2Act.update({
          where: { id: params.ks2Id },
          data: {
            ...(status && { status }),
            ...(excludedAdditionalCostIds !== undefined && { excludedAdditionalCostIds }),
            ...(correctionToKs2Id !== undefined && { correctionToKs2Id }),
          },
        });
      }
    }

    const updated = await db.ks2Act.findUnique({
      where: { id: params.ks2Id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        ks3Certificate: { select: { id: true, status: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления акта КС-2');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** DELETE — удалить черновик КС-2 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const act = await db.ks2Act.findFirst({
      where: { id: params.ks2Id, contractId: params.contractId },
    });
    if (!act) return errorResponse('Акт КС-2 не найден', 404);
    if (act.status !== 'DRAFT') return errorResponse('Удалить можно только черновик', 400);

    await db.ks2Act.delete({ where: { id: params.ks2Id } });

    return successResponse({ message: 'Акт удалён' });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления акта КС-2');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
