import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** GET — список импортов сметы по договору */
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

    const imports = await db.estimateImport.findMany({
      where: { contractId: params.contractId },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(imports);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения импортов смет');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
