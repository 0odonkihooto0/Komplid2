import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { updateOrganizationSchema } from '@/lib/validations/organization';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSessionOrThrow();
    const organization = await db.organization.findUnique({
      where: { id: session.user.organizationId },
    });

    if (!organization) {
      return errorResponse('Организация не найдена', 404);
    }

    return successResponse(organization);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения организации');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();

    // Только админ может редактировать организацию
    if (session.user.role !== 'ADMIN') {
      return errorResponse('Недостаточно прав', 403);
    }

    const body = await req.json();
    const parsed = updateOrganizationSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const organization = await db.organization.update({
      where: { id: session.user.organizationId },
      data: parsed.data,
    });

    return successResponse(organization);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления организации');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
