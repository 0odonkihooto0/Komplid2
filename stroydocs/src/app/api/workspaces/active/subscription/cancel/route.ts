import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveWorkspaceOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

// POST /api/workspaces/active/subscription/cancel — отменить автопродление
export async function POST() {
  try {
    const { workspaceId } = await getActiveWorkspaceOrThrow();

    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { activeSubscriptionId: true },
    });

    if (!workspace?.activeSubscriptionId) {
      return errorResponse('Активная подписка не найдена', 404);
    }

    const updated = await db.subscription.update({
      where: { id: workspace.activeSubscriptionId },
      data: {
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
      },
    });

    return successResponse({ subscription: updated });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return errorResponse('Ошибка при отмене подписки', 500);
  }
}
