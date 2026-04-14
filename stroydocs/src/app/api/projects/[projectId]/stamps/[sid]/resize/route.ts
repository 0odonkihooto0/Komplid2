import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const resizeSchema = z.object({
  width: z.number().positive('Ширина должна быть положительной'),
  height: z.number().positive('Высота должна быть положительной'),
});

type Params = { params: { projectId: string; sid: string } };

/**
 * PATCH /api/projects/[projectId]/stamps/[sid]/resize
 * Изменить размер штампа.
 * Body: { width, height }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const stamp = await db.pdfStamp.findFirst({ where: { id: params.sid } });
    if (!stamp) return errorResponse('Штамп не найден', 404);

    const body = await req.json();
    const parsed = resizeSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.pdfStamp.update({
      where: { id: params.sid },
      data: {
        width: parsed.data.width,
        height: parsed.data.height,
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка изменения размера штампа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
