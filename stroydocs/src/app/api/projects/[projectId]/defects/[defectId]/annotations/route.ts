import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';
interface Params { projectId: string; defectId: string }

const annotationsSchema = z.object({
  annotations: z.record(z.string(), z.unknown()),
});

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const existing = await db.defect.findFirst({
      where: {
        id: params.defectId,
        projectId: params.projectId,
        buildingObject: { organizationId: orgId },
      },
      select: { id: true },
    });
    if (!existing) return errorResponse('Дефект не найден', 404);

    const body: unknown = await req.json();
    const parsed = annotationsSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.defect.update({
      where: { id: params.defectId },
      data: { annotations: parsed.data.annotations },
      select: { id: true, annotations: true },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка сохранения аннотаций дефекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
