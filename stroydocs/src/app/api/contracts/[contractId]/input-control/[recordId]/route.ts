import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { getDownloadUrl } from '@/lib/s3-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/** Проверка доступа к договору через организацию */
async function verifyContractAccess(contractId: string, organizationId: string) {
  return db.contract.findFirst({
    where: { id: contractId, buildingObject: { organizationId } },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { contractId: string; recordId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await verifyContractAccess(params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const record = await db.inputControlRecord.findFirst({
      where: {
        id: params.recordId,
        batch: { material: { contractId: params.contractId } },
      },
      include: {
        batch: {
          include: {
            material: { select: { id: true, name: true, unit: true } },
          },
        },
        inspector: { select: { id: true, firstName: true, lastName: true, position: true } },
        acts: true,
      },
    });

    if (!record) return errorResponse('Запись ЖВК не найдена', 404);

    // Добавляем downloadUrl к каждому акту
    const actsWithUrls = await Promise.all(
      record.acts.map(async (act) => ({
        ...act,
        downloadUrl: await getDownloadUrl(act.s3Key),
      }))
    );

    return successResponse({ ...record, acts: actsWithUrls });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения записи ЖВК');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { contractId: string; recordId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await verifyContractAccess(params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const record = await db.inputControlRecord.findFirst({
      where: {
        id: params.recordId,
        batch: { material: { contractId: params.contractId } },
      },
    });

    if (!record) return errorResponse('Запись ЖВК не найдена', 404);

    await db.inputControlRecord.delete({ where: { id: params.recordId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления записи ЖВК');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
