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

const postSchema = z.object({
  estimateVersionId: z.string().min(1, 'ID версии сметы обязателен'),
});

const deleteSchema = z.object({
  id: z.string().min(1, 'ID записи обязателен'),
});

// Получить список EstimateContractVersion для EstimateContracts этого договора
export async function GET(
  _req: NextRequest,
  { params }: { params: Params },
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.projectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    // Получаем все EstimateContract для этого договора с их версиями
    const estimateContracts = await db.estimateContract.findMany({
      where: { contractId: params.contractId },
      include: {
        versions: {
          include: {
            estimateVersion: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    // Флатим: собираем все EstimateContractVersion из всех EstimateContract
    const result = estimateContracts.flatMap((ec) => ec.versions);

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения связанных смет договора');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Привязать версию сметы к договору через EstimateContractVersion
export async function POST(
  req: NextRequest,
  { params }: { params: Params },
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.projectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const { estimateVersionId } = parsed.data;

    // Проверяем что EstimateVersion существует и принадлежит тому же объекту строительства
    const estimateVersion = await db.estimateVersion.findFirst({
      where: {
        id: estimateVersionId,
        contract: { projectId: params.projectId },
      },
    });

    if (!estimateVersion) return errorResponse('Версия сметы не найдена или не принадлежит данному объекту', 404);

    // findOrCreate EstimateContract для этого договора (первый найденный или создать дефолтный)
    let estimateContract = await db.estimateContract.findFirst({
      where: { contractId: params.contractId },
    });

    if (!estimateContract) {
      estimateContract = await db.estimateContract.create({
        data: {
          name: `Смета договора`,
          contractId: params.contractId,
          createdById: session.user.id,
        },
      });
    }

    // Создаём EstimateContractVersion
    const created = await db.estimateContractVersion.create({
      data: {
        estimateContractId: estimateContract.id,
        estimateVersionId,
        order: 0,
      },
      include: {
        estimateVersion: true,
      },
    });

    return successResponse(created);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка привязки сметы к договору');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Удалить EstimateContractVersion по id
export async function DELETE(
  req: NextRequest,
  { params }: { params: Params },
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await findContract(params.projectId, params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const body = await req.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const { id } = parsed.data;

    // Проверяем что EstimateContractVersion принадлежит EstimateContract этого договора
    const ecv = await db.estimateContractVersion.findFirst({
      where: { id },
      include: {
        estimateContract: { select: { contractId: true } },
      },
    });

    if (!ecv) return errorResponse('Запись не найдена', 404);

    if (ecv.estimateContract.contractId !== params.contractId) {
      return errorResponse('Запись не принадлежит данному договору', 403);
    }

    await db.estimateContractVersion.delete({ where: { id } });

    return successResponse({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка открепления сметы от договора');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
