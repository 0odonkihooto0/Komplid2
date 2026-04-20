import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';
interface Params { id: string }

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();

    const widget = await db.dashboardWidget.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!widget) return errorResponse('Виджет не найден', 404);

    const schema = z.object({
      title:     z.string().min(1).optional(),
      position:  z.number().int().min(0).optional(),
      colSpan:   z.number().int().min(1).max(3).optional(),
      isVisible: z.boolean().optional(),
      config:    z.any().optional(),
    });

    const body: unknown = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.dashboardWidget.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления виджета');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();

    const widget = await db.dashboardWidget.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!widget) return errorResponse('Виджет не найден', 404);

    await db.dashboardWidget.delete({ where: { id: params.id } });
    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления виджета');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
