import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/** Схема создания позиции номенклатуры */
const createNomenclatureSchema = z.object({
  name: z.string().min(1, 'Наименование обязательно'),
  unit: z.string().optional(),
  category: z.string().optional(),
  vendorCode: z.string().optional(),
});

/**
 * GET /api/organizations/[orgId]/nomenclature
 * Список номенклатуры организации с пагинацией и поиском.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности к организации (multi-tenancy)
    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Нет доступа к этой организации', 403);
    }

    const { searchParams } = req.nextUrl;
    const q = searchParams.get('q')?.trim() ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const rawLimit = parseInt(searchParams.get('limit') ?? '50', 10);
    const limit = Math.min(Math.max(1, rawLimit), 200);
    const skip = (page - 1) * limit;

    // Фильтр поиска по названию, артикулу или категории
    const whereFilter = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { vendorCode: { contains: q, mode: 'insensitive' as const } },
            { category: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [items, total] = await db.$transaction([
      db.materialNomenclature.findMany({
        where: {
          organizationId: params.orgId,
          ...whereFilter,
        },
        orderBy: { name: 'asc' },
        take: limit,
        skip,
      }),
      db.materialNomenclature.count({
        where: {
          organizationId: params.orgId,
          ...whereFilter,
        },
      }),
    ]);

    return successResponse(items, { total, page, pageSize: limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения списка номенклатуры');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/**
 * POST /api/organizations/[orgId]/nomenclature
 * Создание новой позиции номенклатуры.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { orgId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности к организации (multi-tenancy)
    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Нет доступа к этой организации', 403);
    }

    const body: unknown = await req.json();
    const parsed = createNomenclatureSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const nomenclature = await db.materialNomenclature.create({
      data: {
        ...parsed.data,
        organizationId: params.orgId,
      },
    });

    return successResponse(nomenclature);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания номенклатуры');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
