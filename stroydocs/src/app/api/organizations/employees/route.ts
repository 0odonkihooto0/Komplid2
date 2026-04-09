import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSessionOrThrow();

    const employees = await db.user.findMany({
      where: { organizationId: session.user.organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phone: true,
        position: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { lastName: 'asc' },
    });

    return successResponse(employees);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения сотрудников');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
