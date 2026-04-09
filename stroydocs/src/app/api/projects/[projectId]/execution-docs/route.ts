import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/**
 * GET — поиск исполнительных документов по объекту строительства.
 * Используется для привязки ИД к задачам ГПР.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? '';
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));

    const docs = await db.executionDoc.findMany({
      where: {
        contract: { projectId: params.projectId },
        ...(search
          ? {
              OR: [
                { number: { contains: search, mode: 'insensitive' } },
                { title: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        number: true,
        title: true,
        type: true,
        status: true,
      },
      orderBy: [{ number: 'asc' }],
      take: limit,
    });

    return successResponse(docs);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка поиска ИД по объекту');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
