import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** GET — получить текущую смету контракта */
export async function GET(
  _req: NextRequest,
  { params }: { params: { objectId: string; contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const estimateContract = await db.estimateContract.findFirst({
      where: { contractId: params.contractId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        versions: {
          orderBy: { order: 'asc' },
          include: {
            estimateVersion: {
              select: {
                id: true,
                name: true,
                versionType: true,
                isBaseline: true,
                isActual: true,
                period: true,
                totalAmount: true,
                totalLabor: true,
                totalMat: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    return successResponse(estimateContract);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения сметы контракта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const upsertContractSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(300),
  versionIds: z
    .array(z.string().uuid())
    .min(1, 'Необходимо выбрать хотя бы одну версию сметы'),
});

/**
 * POST — создать или обновить смету контракта.
 * Один договор = одна смета контракта (upsert по contractId).
 * Пересоздаёт связи EstimateContractVersion из переданного versionIds.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const contract = await db.contract.findFirst({
      where: { id: params.contractId, projectId: params.objectId },
    });
    if (!contract) return errorResponse('Договор не найден', 404);

    const body = await req.json();
    const parsed = upsertContractSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const data = parsed.data;

    // Проверяем что все версии принадлежат этому договору
    const versions = await db.estimateVersion.findMany({
      where: { id: { in: data.versionIds }, contractId: params.contractId },
      select: { id: true, totalAmount: true, totalLabor: true, totalMat: true },
    });

    if (versions.length !== data.versionIds.length) {
      return errorResponse('Одна или несколько версий смет не найдены в этом договоре', 400);
    }

    // Вычисляем суммарные итоги
    const totalAmount = versions.reduce((s, v) => s + (v.totalAmount ?? 0), 0);

    const estimateContract = await db.$transaction(async (tx) => {
      // Upsert сметы контракта
      const existing = await tx.estimateContract.findFirst({
        where: { contractId: params.contractId },
        select: { id: true },
      });

      let contractRecord;
      if (existing) {
        // Удаляем старые связи
        await tx.estimateContractVersion.deleteMany({
          where: { estimateContractId: existing.id },
        });
        contractRecord = await tx.estimateContract.update({
          where: { id: existing.id },
          data: { name: data.name, totalAmount },
        });
      } else {
        contractRecord = await tx.estimateContract.create({
          data: {
            name: data.name,
            totalAmount,
            contractId: params.contractId,
            createdById: session.user.id,
          },
        });
      }

      // Создаём новые связи с версиями
      await tx.estimateContractVersion.createMany({
        data: data.versionIds.map((versionId, idx) => ({
          estimateContractId: contractRecord.id,
          estimateVersionId: versionId,
          order: idx,
        })),
      });

      return contractRecord;
    });

    logger.info(
      { contractId: params.contractId, estimateContractId: estimateContract.id, versionCount: versions.length },
      'Смета контракта обновлена'
    );

    // Возвращаем полный объект
    const fullContract = await db.estimateContract.findUnique({
      where: { id: estimateContract.id },
      include: {
        versions: {
          orderBy: { order: 'asc' },
          include: { estimateVersion: true },
        },
      },
    });

    return successResponse(fullContract);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания/обновления сметы контракта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
