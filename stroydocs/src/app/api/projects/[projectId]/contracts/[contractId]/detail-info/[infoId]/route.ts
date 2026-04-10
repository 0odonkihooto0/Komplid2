import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type Params = { projectId: string; contractId: string; infoId: string };

// Вспомогательная: проверить доступ к договору
async function findContract(projectId: string, contractId: string, organizationId: string) {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
  });
  if (!project) return null;

  return db.contract.findFirst({ where: { id: contractId, projectId } });
}

// Вспомогательная: найти реквизит и убедиться что он принадлежит договору
async function findDetailInfo(contractId: string, infoId: string) {
  const detailInfo = await db.contractDetailInfo.findFirst({
    where: { id: infoId },
  });
  if (!detailInfo || detailInfo.contractId !== contractId) return null;
  return detailInfo;
}

const updateDetailInfoSchema = z.object({
  fieldName: z.string().min(1, 'Название поля обязательно').optional(),
  fieldValue: z.string().optional(),
});

// Обновить дополнительный реквизит договора
export async function PUT(
  req: NextRequest,
  { params }: { params: Params },
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.projectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const detailInfo = await findDetailInfo(params.contractId, params.infoId);
    if (!detailInfo) return errorResponse('Реквизит не найден', 404);

    const body = await req.json();
    const parsed = updateDetailInfoSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const updated = await db.contractDetailInfo.update({
      where: { id: params.infoId },
      data: {
        fieldName: parsed.data.fieldName,
        fieldValue: parsed.data.fieldValue,
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления дополнительного реквизита договора');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Удалить дополнительный реквизит договора
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Params },
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.projectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const detailInfo = await findDetailInfo(params.contractId, params.infoId);
    if (!detailInfo) return errorResponse('Реквизит не найден', 404);

    await db.contractDetailInfo.delete({ where: { id: params.infoId } });

    return successResponse({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления дополнительного реквизита договора');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
