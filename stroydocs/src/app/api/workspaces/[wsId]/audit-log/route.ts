import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { requirePermission } from '@/lib/permissions/check';
import { ACTIONS } from '@/lib/permissions/actions';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/** Список событий аудита с фильтрами и пагинацией */
export async function GET(
  req: NextRequest,
  { params }: { params: { wsId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    await requirePermission(session.user.id, params.wsId, ACTIONS.WORKSPACE_VIEW_AUDIT_LOG);

    const { searchParams } = req.nextUrl;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const action = searchParams.get('action') ?? '';
    const actorUserId = searchParams.get('actorUserId') ?? '';
    const resourceType = searchParams.get('resourceType') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const take = Math.min(200, parseInt(searchParams.get('take') ?? '50', 10));
    const skip = (page - 1) * take;

    const where = {
      workspaceId: params.wsId,
      ...(action ? { action: { contains: action, mode: 'insensitive' as const } } : {}),
      ...(actorUserId ? { actorUserId } : {}),
      ...(resourceType ? { resourceType } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59Z`) } : {}),
            },
          }
        : {}),
    };

    const [events, total] = await db.$transaction([
      db.auditLog.findMany({
        where,
        include: {
          actor: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      db.auditLog.count({ where }),
    ]);

    return successResponse(events, {
      page,
      pageSize: take,
      total,
      totalPages: Math.ceil(total / take),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения аудит-лога');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
