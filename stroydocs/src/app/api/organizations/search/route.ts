import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/**
 * GET — поиск организаций по имени или ИНН для диалога добавления участника.
 * Ищет по всем организациям в системе (не только своей).
 * Query: ?q=строка_поиска
 */
export async function GET(req: NextRequest) {
  try {
    await getSessionOrThrow();

    const q = req.nextUrl.searchParams.get('q')?.trim().slice(0, 100) ?? '';
    if (q.length < 2) {
      return successResponse([]);
    }

    const organizations = await db.organization.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { inn: { contains: q } },
        ],
      },
      select: { id: true, name: true, inn: true, address: true },
      take: 10,
      orderBy: { name: 'asc' },
    });

    return successResponse(organizations);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка поиска организаций');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
