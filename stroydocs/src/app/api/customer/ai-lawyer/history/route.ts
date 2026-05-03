export const dynamic = 'force-dynamic';

import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse, successResponse, handleApiError } from '@/utils/api';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSessionOrThrow();

    // Проверяем воркспейс — только владелец видит историю диалогов
    const ws = await db.workspace.findFirst({
      where: { id: session.user.activeWorkspaceId!, ownerId: session.user.id },
    });
    if (!ws) {
      return errorResponse('Доступ запрещён', 403);
    }

    // Загружаем последние 50 сообщений для отображения в UI
    const conversations = await db.lawyerConversation.findMany({
      where: { workspaceId: ws.id },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    return successResponse({ messages: conversations });
  } catch (error) {
    return handleApiError(error);
  }
}
