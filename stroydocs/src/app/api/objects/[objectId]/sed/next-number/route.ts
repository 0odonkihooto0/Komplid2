import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/objects/[objectId]/sed/next-number
 * Возвращает предпросмотр следующего номера СЭД-документа без advisory lock.
 * Используется для предзаполнения поля «Номер» в диалоге создания.
 * Не является атомарным — финальный номер генерируется при POST /sed.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { objectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const year = new Date().getFullYear();
    const count = await db.sEDDocument.count({
      where: {
        projectId: params.objectId,
        number: { startsWith: `СЭД-${year}-` },
      },
    });

    const preview = `СЭД-${year}-${String(count + 1).padStart(3, '0')}`;
    return successResponse({ number: preview });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения следующего номера СЭД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
