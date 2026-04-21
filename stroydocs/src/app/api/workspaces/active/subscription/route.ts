import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveWorkspaceOrThrow } from '@/lib/auth-utils';
import { getActivePlan } from '@/lib/subscriptions/get-active-plan';
import { successResponse, errorResponse } from '@/utils/api';
export const dynamic = 'force-dynamic';


// GET /api/workspaces/active/subscription — текущая подписка + потребление лимитов
export async function GET() {
  try {
    const { workspaceId } = await getActiveWorkspaceOrThrow();

    const active = await getActivePlan(workspaceId);
    if (!active) {
      return errorResponse('Тарифный план не найден', 404);
    }

    // Текущее потребление лимитов
    const [objectsCount] = await Promise.all([
      db.buildingObject.count({ where: { workspaceId } }),
    ]);

    const usage: Record<string, number> = {
      maxObjects: objectsCount,
    };

    return successResponse({
      plan: active.plan,
      subscription: active.subscription,
      isInGracePeriod: active.isInGracePeriod,
      usage,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return errorResponse('Ошибка при получении подписки', 500);
  }
}
