import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { updateWorkRecordSchema } from '@/lib/validations/work-record';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; workRecordId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const workRecord = await db.workRecord.findFirst({
      where: { id: params.workRecordId },
      include: {
        workItem: { select: { id: true, projectCipher: true, name: true } },

        writeoffs: {
          include: {
            material: { select: { id: true, name: true, unit: true } },
          },
        },
      },
    });
    if (!workRecord) return errorResponse('Запись не найдена', 404);

    return successResponse(workRecord);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения записи о работе');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; workRecordId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = updateWorkRecordSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { date, ...rest } = parsed.data;

    const workRecord = await db.workRecord.update({
      where: { id: params.workRecordId },
      data: {
        ...rest,
        ...(date && { date: new Date(date) }),
      },
      include: {
        workItem: { select: { id: true, projectCipher: true, name: true } },

      },
    });

    return successResponse(workRecord);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления записи о работе');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; workRecordId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Транзакция: реверсирование списаний одним SQL + удаление записи
    await db.$transaction(async (tx) => {
      // Восстанавливаем остатки материалов одним запросом вместо цикла
      await tx.$executeRaw`
        UPDATE materials m
        SET "quantityUsed" = m."quantityUsed" - agg.total
        FROM (
          SELECT "materialId", SUM(quantity) AS total
          FROM material_writeoffs
          WHERE "workRecordId" = ${params.workRecordId}
          GROUP BY "materialId"
        ) agg
        WHERE m.id = agg."materialId"
      `;

      await tx.workRecord.delete({ where: { id: params.workRecordId } });
    });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления записи о работе');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
