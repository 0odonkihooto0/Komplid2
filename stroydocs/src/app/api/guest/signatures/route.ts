import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { guestScopeSchema } from '@/types/guest-scope';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSessionOrThrow();
    const activeWorkspaceId = session.user.activeWorkspaceId;

    if (!activeWorkspaceId) return errorResponse('Нет активного workspace', 403);

    // Проверка что пользователь — гость в этом workspace
    const member = await db.workspaceMember.findFirst({
      where: { userId: session.user.id, workspaceId: activeWorkspaceId },
      select: { role: true, guestScope: true },
    });

    if (!member || member.role !== 'GUEST') {
      return errorResponse('Нет доступа', 403);
    }

    // Парсим scope для валидации сессии
    guestScopeSchema.parse(member.guestScope);

    // Список подписей текущего гостя в рамках workspace
    const signatures = await db.guestSignature.findMany({
      where: {
        signerUserId: session.user.id,
        workspaceId: activeWorkspaceId,
      },
      include: {
        executionDoc: {
          select: { id: true, title: true, type: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Форматируем для клиента
    const result = signatures.map((sig) => ({
      id: sig.id,
      status: sig.status,
      method: sig.method,
      createdAt: sig.createdAt,
      confirmedAt: sig.confirmedAt,
      document: sig.executionDoc
        ? {
            id: sig.executionDoc.id,
            title: sig.executionDoc.title,
            type: sig.executionDoc.type,
          }
        : null,
    }));

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения списка подписей гостя');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
