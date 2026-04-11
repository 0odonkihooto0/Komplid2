import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateStampSchema = z.object({
  stampText: z.string().min(1).optional(),
  titleId: z.string().nullable().optional(),
});

type Params = { params: { projectId: string; sid: string } };

/** Найти штамп с проверкой принадлежности к проекту организации */
async function findStamp(projectId: string, organizationId: string, sid: string) {
  // Проверяем проект принадлежит организации
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
  });
  if (!project) return null;

  return db.pdfStamp.findFirst({ where: { id: sid } });
}

/**
 * GET /api/projects/[projectId]/stamps/[sid]
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const stamp = await findStamp(params.projectId, session.user.organizationId, params.sid);
    if (!stamp) return errorResponse('Штамп не найден', 404);

    return successResponse(stamp);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения штампа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/**
 * PATCH /api/projects/[projectId]/stamps/[sid]
 * Обновить текст штампа или привязку к справочнику титулов.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const stamp = await findStamp(params.projectId, session.user.organizationId, params.sid);
    if (!stamp) return errorResponse('Штамп не найден', 404);

    const body = await req.json();
    const parsed = updateStampSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.pdfStamp.update({
      where: { id: params.sid },
      data: {
        ...(parsed.data.stampText !== undefined && { stampText: parsed.data.stampText }),
        ...(parsed.data.titleId !== undefined && { titleId: parsed.data.titleId }),
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления штампа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/**
 * DELETE /api/projects/[projectId]/stamps/[sid]
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const stamp = await findStamp(params.projectId, session.user.organizationId, params.sid);
    if (!stamp) return errorResponse('Штамп не найден', 404);

    await db.pdfStamp.delete({ where: { id: params.sid } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления штампа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
