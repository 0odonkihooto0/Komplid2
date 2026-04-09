import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; versionId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const dependencies = await db.ganttDependency.findMany({
      where: { predecessor: { versionId: params.versionId } },
      include: {
        predecessor: { select: { id: true, name: true } },
        successor: { select: { id: true, name: true } },
      },
    });

    return successResponse(dependencies);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения зависимостей');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const createDepSchema = z.object({
  predecessorId: z.string().uuid(),
  successorId: z.string().uuid(),
  type: z.enum(['FS', 'SS', 'FF', 'SF']).default('FS'),
  lagDays: z.number().int().default(0),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; versionId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createDepSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    if (parsed.data.predecessorId === parsed.data.successorId) {
      return errorResponse('Задача не может зависеть от себя', 400);
    }

    const dep = await db.ganttDependency.create({ data: parsed.data });
    return successResponse(dep);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания зависимости');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; versionId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const depId = req.nextUrl.searchParams.get('depId');
    if (!depId) return errorResponse('depId обязателен', 400);

    await db.ganttDependency.delete({ where: { id: depId } });
    return successResponse({ ok: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления зависимости');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
