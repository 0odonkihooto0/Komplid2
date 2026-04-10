import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type Params = { projectId: string; contractId: string };

// Вспомогательная: проверить доступ к договору
async function findContract(projectId: string, contractId: string, organizationId: string) {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
  });
  if (!project) return null;

  return db.contract.findFirst({ where: { id: contractId, projectId } });
}

const createDetailInfoSchema = z.object({
  fieldName: z.string().min(1, 'Название поля обязательно'),
  fieldValue: z.string().optional(),
});

// Получить список дополнительных реквизитов договора
export async function GET(
  _req: NextRequest,
  { params }: { params: Params },
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.projectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const detailInfo = await db.contractDetailInfo.findMany({
      where: { contractId: params.contractId },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(detailInfo);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения дополнительных реквизитов договора');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Создать дополнительный реквизит договора
export async function POST(
  req: NextRequest,
  { params }: { params: Params },
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.projectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const body = await req.json();
    const parsed = createDetailInfoSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const detailInfo = await db.contractDetailInfo.create({
      data: {
        fieldName: parsed.data.fieldName,
        fieldValue: parsed.data.fieldValue,
        contractId: params.contractId,
      },
    });

    return successResponse(detailInfo);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания дополнительного реквизита договора');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
