import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { exportContractToExcel } from '@/lib/estimates/export-excel';

export const dynamic = 'force-dynamic';

/**
 * GET — экспорт сметы контракта в формат xlsx.
 * Возвращает файл Excel с иерархической структурой (главы + позиции + итоги).
 */
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
    });
    if (!estimateContract) {
      return errorResponse('Смета контракта не сформирована', 404);
    }

    const buffer = await exportContractToExcel(params.contractId);

    const filename = encodeURIComponent(`Смета_контракта_${new Date().toISOString().slice(0, 10)}.xlsx`);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка экспорта сметы контракта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
