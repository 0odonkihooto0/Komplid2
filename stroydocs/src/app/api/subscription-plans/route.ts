import { db } from '@/lib/db';
import { successResponse } from '@/utils/api';

// GET /api/subscription-plans — публичный, для лендинга и страницы тарифов
export async function GET() {
  const plans = await db.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
  });
  return successResponse(plans);
}
