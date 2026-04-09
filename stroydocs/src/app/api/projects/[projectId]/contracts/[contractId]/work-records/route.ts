import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { createWorkRecordSchema } from '@/lib/validations/work-record';
import { successResponse, errorResponse } from '@/utils/api';
import { triggerAosrDraftFromOzr } from '@/lib/journal-triggers';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const url = req.nextUrl;
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50')));
    const skip = (page - 1) * limit;

    const [workRecords, total] = await Promise.all([
      db.workRecord.findMany({
        where: { contractId: params.contractId },
        include: {
          workItem: { select: { id: true, projectCipher: true, name: true } },
          _count: { select: { writeoffs: true } },
        },
        orderBy: { date: 'desc' },
        take: limit,
        skip,
      }),
      db.workRecord.count({ where: { contractId: params.contractId } }),
    ]);

    return successResponse({ data: workRecords, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения записей о работах');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createWorkRecordSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { writeoffs = [], date, ...rest } = parsed.data;

    // Проверка остатков материалов перед списанием (batch-запрос вместо N+1)
    if (writeoffs.length > 0) {
      const materialIds = writeoffs.map((wo) => wo.materialId);
      const materials = await db.material.findMany({
        where: { id: { in: materialIds } },
      });
      const materialMap = new Map(materials.map((m) => [m.id, m]));

      for (const wo of writeoffs) {
        const material = materialMap.get(wo.materialId);
        if (!material) {
          return errorResponse(`Материал не найден: ${wo.materialId}`, 400);
        }
        const remaining = material.quantityReceived - material.quantityUsed;
        if (wo.quantity > remaining) {
          return errorResponse(
            `Недостаточно материала "${material.name}": остаток ${remaining}, запрошено ${wo.quantity}`,
            400
          );
        }
      }
    }

    // Транзакция: создание записи + списание материалов
    const workRecord = await db.$transaction(async (tx) => {
      const record = await tx.workRecord.create({
        data: {
          ...rest,
          date: new Date(date),
          contractId: params.contractId,
        },
        include: {
          workItem: { select: { id: true, projectCipher: true, name: true } },
  
        },
      });

      if (writeoffs.length > 0) {
        // Создаём все записи списаний одним запросом
        await tx.materialWriteoff.createMany({
          data: writeoffs.map((wo) => ({
            quantity: wo.quantity,
            workRecordId: record.id,
            materialId: wo.materialId,
          })),
        });

        // Обновляем использованное количество материалов одним SQL-запросом
        await tx.$executeRaw`
          UPDATE materials m
          SET "quantityUsed" = m."quantityUsed" + agg.total
          FROM (
            SELECT "materialId", SUM(quantity) AS total
            FROM material_writeoffs
            WHERE "workRecordId" = ${record.id}
            GROUP BY "materialId"
          ) agg
          WHERE m.id = agg."materialId"
        `;
      }

      return record;
    });

    // Автосоздание черновика АОСР (fire-and-forget)
    triggerAosrDraftFromOzr({
      workRecordId: workRecord.id,
      contractId: params.contractId,
      createdById: session.user.id,
    }).catch((err) => logger.error({ err, workRecordId: workRecord.id }, 'AOSR draft trigger failed'));

    return successResponse(workRecord);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания записи о работе');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
