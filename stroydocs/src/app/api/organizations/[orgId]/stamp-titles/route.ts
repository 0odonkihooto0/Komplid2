import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const createStampTitleSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  template: z.string().optional(),
});

type Params = { params: { orgId: string } };

/**
 * GET /api/organizations/[orgId]/stamp-titles
 * Справочник заголовков штампов организации с пагинацией.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Нет доступа к этой организации', 403);
    }

    const sp = req.nextUrl.searchParams;
    const q = sp.get('q')?.trim() ?? '';
    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
    const limit = Math.min(Math.max(1, parseInt(sp.get('limit') ?? '50', 10)), 200);
    const skip = (page - 1) * limit;

    const where = {
      organizationId: params.orgId,
      ...(q && { name: { contains: q, mode: 'insensitive' as const } }),
    };

    const [items, total] = await db.$transaction([
      db.stampTitle.findMany({
        where,
        orderBy: { name: 'asc' },
        take: limit,
        skip,
      }),
      db.stampTitle.count({ where }),
    ]);

    return successResponse(items, {
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения справочника титулов штампов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/**
 * POST /api/organizations/[orgId]/stamp-titles
 * Создать заголовок штампа в справочнике.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Нет доступа к этой организации', 403);
    }

    const body = await req.json();
    const parsed = createStampTitleSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const item = await db.stampTitle.create({
      data: {
        name: parsed.data.name,
        template: parsed.data.template ?? null,
        organizationId: params.orgId,
      },
    });

    return successResponse(item);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания титула штампа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
