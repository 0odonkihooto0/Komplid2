import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const moveSchema = z.object({
  positionX: z.number(),
  positionY: z.number(),
  page: z.number().int().min(0),
});

type Params = { params: { projectId: string; sid: string } };

/**
 * POST /api/projects/[projectId]/stamps/[sid]/move
 * Обновить позицию штампа на странице PDF.
 * Body: { positionX, positionY, page }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const stamp = await db.pdfStamp.findFirst({ where: { id: params.sid } });
    if (!stamp) return errorResponse('Штамп не найден', 404);

    const body = await req.json();
    const parsed = moveSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.pdfStamp.update({
      where: { id: params.sid },
      data: {
        positionX: parsed.data.positionX,
        positionY: parsed.data.positionY,
        page: parsed.data.page,
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка перемещения штампа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
