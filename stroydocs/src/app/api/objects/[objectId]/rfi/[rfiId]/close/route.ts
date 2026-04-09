import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: { objectId: string; rfiId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const rfi = await db.rFI.findFirst({
      where: { id: params.rfiId, projectId: params.objectId },
    });
    if (!rfi) return errorResponse('RFI не найден', 404);

    // Закрыть может только автор или администратор
    const isAdmin = session.user.role === 'ADMIN';
    const isAuthor = rfi.authorId === session.user.id;
    if (!isAdmin && !isAuthor) {
      return errorResponse('Закрыть RFI может только его автор или администратор', 403);
    }

    if (rfi.status === 'CLOSED') {
      return errorResponse('RFI уже закрыт', 409);
    }

    const updated = await db.rFI.update({
      where: { id: params.rfiId },
      data: { status: 'CLOSED' },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка закрытия RFI');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
