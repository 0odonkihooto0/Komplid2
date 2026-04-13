import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const createStatusSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(100),
  color: z.string().max(20).nullable().optional(),
});

/**
 * GET /api/organizations/[orgId]/request-item-statuses
 * Список статусов позиций заявок для организации.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { orgId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Multi-tenancy: только своя организация
    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Нет доступа к этой организации', 403);
    }

    const statuses = await db.materialRequestItemStatus.findMany({
      where: { organizationId: params.orgId },
      orderBy: { name: 'asc' },
    });

    return successResponse(statuses);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения статусов позиций заявок');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/**
 * POST /api/organizations/[orgId]/request-item-statuses
 * Создать новый статус позиции заявки.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { orgId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Multi-tenancy: только своя организация
    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Нет доступа к этой организации', 403);
    }

    const body: unknown = await req.json();
    const parsed = createStatusSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const status = await db.materialRequestItemStatus.create({
      data: {
        name: parsed.data.name,
        color: parsed.data.color ?? null,
        organizationId: params.orgId,
      },
    });

    return successResponse(status);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания статуса позиции заявки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
