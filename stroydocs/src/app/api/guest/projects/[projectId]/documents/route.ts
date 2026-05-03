import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { guestScopeSchema } from '@/types/guest-scope';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

export async function GET(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка что пользователь — активный гость
    const member = await db.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: session.user.activeWorkspaceId!,
      },
      select: { role: true, guestScope: true },
    });

    if (!member || member.role !== 'GUEST') {
      return errorResponse('Нет доступа', 403);
    }

    const scope = guestScopeSchema.parse(member.guestScope);

    // Проверка разрешения на просмотр документов
    if (!scope.permissions.canViewDocuments) {
      return errorResponse('Просмотр документов запрещён', 403);
    }

    // Проверка доступа к конкретному объекту
    if (!scope.allowedProjectIds.includes(params.projectId)) {
      return errorResponse('Нет доступа к этому объекту', 403);
    }

    // Параметры пагинации
    const url = new URL(req.url);
    const skip = Math.max(0, parseInt(url.searchParams.get('skip') ?? '0', 10));

    // Контракты проекта
    const contracts = await db.contract.findMany({
      where: { projectId: params.projectId },
      select: { id: true },
    });
    const contractIds = contracts.map((c) => c.id);

    if (contractIds.length === 0) {
      return successResponse({ items: [], total: 0 });
    }

    // Условие фильтрации: только не-черновики (SIGNED, IN_REVIEW, REJECTED)
    const whereClause = {
      contractId: { in: contractIds },
      status: { not: 'DRAFT' as const },
    };

    // Параллельный запрос: данные и общий счётчик
    const [documents, total] = await Promise.all([
      db.executionDoc.findMany({
        where: whereClause,
        select: {
          id: true,
          type: true,
          title: true,
          number: true,
          status: true,
          createdAt: true,
          qrToken: true,
        },
        orderBy: { createdAt: 'desc' },
        take: PAGE_SIZE,
        skip,
      }),
      db.executionDoc.count({ where: whereClause }),
    ]);

    return successResponse({ items: documents, total });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения документов для гостя');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
