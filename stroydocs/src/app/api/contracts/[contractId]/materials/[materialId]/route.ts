import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({ name: z.string().min(1) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: { contractId: string; materialId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const body = patchSchema.safeParse(await req.json());
    if (!body.success) return errorResponse('Ошибка валидации', 400);

    const material = await db.material.findFirst({
      where: {
        id: params.materialId,
        contractId: params.contractId,
        contract: { buildingObject: { organizationId: session.user.organizationId } },
      },
    });
    if (!material) return errorResponse('Материал не найден', 404);

    const updated = await db.material.update({
      where: { id: params.materialId },
      data: { name: body.data.name },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления материала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
