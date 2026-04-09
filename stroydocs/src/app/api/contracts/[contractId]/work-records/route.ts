import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { createWorkRecordSchema } from '@/lib/validations/work-record';
import { successResponse, errorResponse } from '@/utils/api';
import { getDownloadUrl } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';

/** Проверка доступа к договору */
async function verifyContractAccess(contractId: string, organizationId: string) {
  return db.contract.findFirst({
    where: { id: contractId, buildingObject: { organizationId } },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await verifyContractAccess(params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const records = await db.workRecord.findMany({
      where: { contractId: params.contractId },
      include: {
        workItem: {
          select: {
            id: true,
            projectCipher: true,
            name: true,
            unit: true,
            volume: true,
            ksiNode: { select: { code: true, name: true } },
          },
        },
        writeoffs: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                unit: true,
                documents: {
                  select: { id: true, type: true, fileName: true, s3Key: true },
                },
              },
            },
          },
        },
        executionDocs: {
          select: { id: true, type: true, number: true, status: true, title: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Генерируем downloadUrl для документов материалов
    const result = await Promise.all(
      records.map(async (record) => ({
        ...record,
        writeoffs: await Promise.all(
          record.writeoffs.map(async (wo) => ({
            ...wo,
            material: {
              ...wo.material,
              documents: await Promise.all(
                wo.material.documents.map(async (doc) => ({
                  ...doc,
                  downloadUrl: await getDownloadUrl(doc.s3Key).catch(() => null),
                }))
              ),
            },
          }))
        ),
      }))
    );

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения записей о работах');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await verifyContractAccess(params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const body = await req.json();
    const parsed = createWorkRecordSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { writeoffs, ...recordData } = parsed.data;

    // Проверка что вид работ принадлежит договору
    const workItem = await db.workItem.findFirst({
      where: { id: recordData.workItemId, contractId: params.contractId },
    });
    if (!workItem) return errorResponse('Вид работ не найден в данном договоре', 404);

    // Проверяем остатки материалов перед списанием (batch-запрос вместо N+1)
    if (writeoffs?.length) {
      const materialIds = writeoffs.map((wo) => wo.materialId);
      const materials = await db.material.findMany({
        where: { id: { in: materialIds }, contractId: params.contractId },
      });
      const materialMap = new Map(materials.map((m) => [m.id, m]));

      for (const wo of writeoffs) {
        const material = materialMap.get(wo.materialId);
        if (!material) {
          return errorResponse(`Материал ${wo.materialId} не найден`, 404);
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

    // Создаём запись и списания в одной транзакции
    const record = await db.$transaction(async (tx) => {
      const created = await tx.workRecord.create({
        data: {
          date: new Date(recordData.date),
          location: recordData.location,
          description: recordData.description,
          normative: recordData.normative,
          workItemId: recordData.workItemId,
          contractId: params.contractId,
        },
      });

      // Создаём списания и обновляем остатки (batch-операции)
      if (writeoffs?.length) {
        await tx.materialWriteoff.createMany({
          data: writeoffs.map((wo) => ({
            quantity: wo.quantity,
            workRecordId: created.id,
            materialId: wo.materialId,
          })),
        });

        // Batch-обновление использованного количества одним SQL-запросом
        await tx.$executeRaw`
          UPDATE materials m
          SET "quantityUsed" = m."quantityUsed" + agg.total
          FROM (
            SELECT "materialId", SUM(quantity) AS total
            FROM material_writeoffs
            WHERE "workRecordId" = ${created.id}
            GROUP BY "materialId"
          ) agg
          WHERE m.id = agg."materialId"
        `;
      }

      // Возвращаем с включениями
      return tx.workRecord.findUnique({
        where: { id: created.id },
        include: {
          workItem: {
            select: {
              projectCipher: true,
              name: true,
              ksiNode: { select: { code: true, name: true } },
            },
          },
          writeoffs: {
            include: { material: { select: { name: true, unit: true } } },
          },
        },
      });
    });

    return successResponse(record);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания записи о работе');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
