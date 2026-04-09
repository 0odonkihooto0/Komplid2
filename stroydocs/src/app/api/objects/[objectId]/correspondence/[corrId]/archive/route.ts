import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: { objectId: string; corrId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const correspondence = await db.correspondence.findFirst({
      where: { id: params.corrId, projectId: params.objectId },
    });
    if (!correspondence) return errorResponse('Письмо не найдено', 404);

    if (correspondence.status === 'ARCHIVED') {
      return errorResponse('Письмо уже находится в архиве', 409);
    }

    const updated = await db.correspondence.update({
      where: { id: params.corrId },
      data: { status: 'ARCHIVED' },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка архивирования письма');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
