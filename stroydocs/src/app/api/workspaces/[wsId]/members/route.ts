import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { requirePermission } from '@/lib/permissions/check';
import { ACTIONS } from '@/lib/permissions/actions';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/** Список членов workspace с пагинацией и фильтрами */
export async function GET(
  req: NextRequest,
  { params }: { params: { wsId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    await requirePermission(session.user.id, params.wsId, ACTIONS.WORKSPACE_MANAGE_MEMBERS);

    const { searchParams } = req.nextUrl;
    const search = searchParams.get('search') ?? '';
    const role = searchParams.get('role') ?? '';
    const status = searchParams.get('status') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const take = Math.min(200, parseInt(searchParams.get('take') ?? '50', 10));
    const skip = (page - 1) * take;

    // Фильтр по поиску (имя или email пользователя)
    const userFilter = search
      ? {
          user: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          },
        }
      : {};

    const where = {
      workspaceId: params.wsId,
      ...(role ? { role: role as never } : {}),
      ...(status ? { status: status as never } : {}),
      ...userFilter,
    };

    const [members, total] = await db.$transaction([
      db.workspaceMember.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              middleName: true,
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
        take,
        skip,
      }),
      db.workspaceMember.count({ where }),
    ]);

    return successResponse(members, { page, pageSize: take, total, totalPages: Math.ceil(total / take) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения членов workspace');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
