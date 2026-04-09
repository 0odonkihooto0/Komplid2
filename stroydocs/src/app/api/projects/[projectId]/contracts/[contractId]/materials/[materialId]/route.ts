import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { updateMaterialSchema } from '@/lib/validations/material';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; materialId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const material = await db.material.findFirst({
      where: { id: params.materialId, contractId: params.contractId },
      include: {
        documents: true,
        _count: { select: { writeoffs: true } },
      },
    });
    if (!material) return errorResponse('Материал не найден', 404);

    return successResponse({
      ...material,
      remaining: material.quantityReceived - material.quantityUsed,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения материала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; materialId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = updateMaterialSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { invoiceDate, ...rest } = parsed.data;

    const material = await db.material.update({
      where: { id: params.materialId },
      data: {
        ...rest,
        ...(invoiceDate !== undefined && {
          invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
        }),
      },
    });

    return successResponse(material);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления материала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; materialId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверка наличия списаний
    const writeoffsCount = await db.materialWriteoff.count({
      where: { materialId: params.materialId },
    });
    if (writeoffsCount > 0) {
      return errorResponse('Невозможно удалить: материал используется в записях о работах', 400);
    }

    await db.material.delete({ where: { id: params.materialId } });
    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления материала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
