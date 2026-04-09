import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/** GET /api/objects/[objectId]/contracts/[contractId]/stats — KPI-статистика договора */
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

    const contract = await db.contract.findFirst({
      where: { id: params.contractId, projectId: params.objectId },
    });
    if (!contract) return errorResponse('Договор не найден', 404);

    const [workRecordsCount, aosrCount, signedCount, materialsCount] = await Promise.all([
      db.workRecord.count({ where: { contractId: params.contractId } }),
      db.executionDoc.count({ where: { contractId: params.contractId, type: 'AOSR' } }),
      db.executionDoc.count({ where: { contractId: params.contractId, status: 'SIGNED' } }),
      db.material.count({ where: { contractId: params.contractId } }),
    ]);

    return successResponse({ workRecordsCount, aosrCount, signedCount, materialsCount });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return errorResponse('Ошибка получения статистики', 500);
  }
}
