import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveWorkspaceOrThrow } from '@/lib/auth-utils';
import { reactivateSubscription } from '@/lib/payments/subscription-service';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { session, workspaceId } = await getActiveWorkspaceOrThrow();

    const sub = await db.subscription.findFirst({
      where: { id: params.id, workspaceId },
    });
    if (!sub) return errorResponse('Подписка не найдена', 404);
    if (!sub.cancelAtPeriodEnd) {
      return errorResponse('Подписка не находится в статусе отмены', 400);
    }

    await reactivateSubscription({ workspaceId, userId: session.user.id });

    return successResponse({ reactivated: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    if (error instanceof Error) return errorResponse(error.message, 400);
    return errorResponse('Ошибка при восстановлении подписки', 500);
  }
}
