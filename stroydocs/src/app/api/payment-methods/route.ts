import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveWorkspaceOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { workspaceId } = await getActiveWorkspaceOrThrow();

    const methods = await db.paymentMethod.findMany({
      where: { workspaceId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return successResponse(methods);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return errorResponse('Ошибка при получении методов оплаты', 500);
  }
}
