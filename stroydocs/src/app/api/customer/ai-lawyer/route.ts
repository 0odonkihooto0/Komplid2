export const dynamic = 'force-dynamic';

import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse, successResponse, handleApiError } from '@/utils/api';
import { requireFeature } from '@/lib/subscriptions/require-feature';
import { FEATURE_CODES } from '@/lib/features/codes';
import { db } from '@/lib/db';
import { askLawyer } from '@/lib/ai/lawyer';

export async function POST(request: Request) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем воркспейс — только владелец может использовать AI-юриста
    const ws = await db.workspace.findFirst({
      where: { id: session.user.activeWorkspaceId!, ownerId: session.user.id },
    });
    if (!ws) {
      return errorResponse('Доступ запрещён', 403);
    }

    // Проверяем наличие фичи в плане подписки (бросает PaymentRequiredError → 402)
    await requireFeature(ws.id, FEATURE_CODES.CUSTOMER_AI_LAWYER);

    // Дневной лимит: максимум 20 вопросов за 24 часа на воркспейс
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailyCount = await db.lawyerConversation.count({
      where: {
        workspaceId: ws.id,
        role: 'user',
        createdAt: { gte: dayAgo },
      },
    });
    if (dailyCount >= 20) {
      return errorResponse('Достигнут дневной лимит 20 вопросов', 429);
    }

    const body = await request.json() as { message?: string };
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return errorResponse('Сообщение не может быть пустым', 400);
    }

    // Загружаем историю последних 10 сообщений для контекста
    const historyRecords = await db.lawyerConversation.findMany({
      where: { workspaceId: ws.id },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    const history = historyRecords.map((r) => ({
      role: r.role,
      content: r.content,
    }));

    // Сохраняем вопрос пользователя в историю
    await db.lawyerConversation.create({
      data: {
        workspaceId: ws.id,
        userId: session.user.id,
        role: 'user',
        content: message,
      },
    });

    // Вызываем AI-юриста (YandexGPT + Gemini fallback)
    const answer = await askLawyer([...history, { role: 'user', content: message }]);

    // Сохраняем ответ ассистента в историю
    const assistantRecord = await db.lawyerConversation.create({
      data: {
        workspaceId: ws.id,
        userId: session.user.id,
        role: 'assistant',
        content: answer,
      },
    });

    return successResponse({ answer, conversationId: assistantRecord.id });
  } catch (error) {
    return handleApiError(error);
  }
}
