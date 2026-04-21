import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { getActivePlan } from '@/lib/subscriptions/get-active-plan';
import { successResponse, errorResponse } from '@/utils/api';
export const dynamic = 'force-dynamic';


// GET /api/workspaces/[wsId]/subscription — подписка workspace по ID (только для участника)
export async function GET(
  _req: Request,
  { params }: { params: { wsId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем что пользователь — участник этого workspace
    const member = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: params.wsId,
          userId: session.user.id,
        },
      },
    });

    if (!member) {
      return errorResponse('Доступ запрещён', 403);
    }

    const active = await getActivePlan(params.wsId);
    if (!active) {
      return errorResponse('Тарифный план не найден', 404);
    }

    return successResponse({
      plan: active.plan,
      subscription: active.subscription,
      isInGracePeriod: active.isInGracePeriod,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return errorResponse('Ошибка при получении подписки', 500);
  }
}
