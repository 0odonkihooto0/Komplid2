import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const createNomenclatureSchema = z.object({
  name: z.string().min(1).max(500),
  unit: z.string().max(50).optional(),
  category: z.string().max(200).optional(),
  vendorCode: z.string().max(100).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const page = Number(req.nextUrl.searchParams.get('page') ?? 1);
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 50), 200);
    const skip = (page - 1) * limit;
    const search = req.nextUrl.searchParams.get('search') ?? '';

    const where = {
      organizationId: session.user.organizationId,
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    };

    const [data, total] = await db.$transaction([
      db.materialNomenclature.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, unit: true, category: true, vendorCode: true },
      }),
      db.materialNomenclature.count({ where }),
    ]);

    return successResponse(data, { total, page, pageSize: limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения номенклатуры');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const body = await req.json() as unknown;
    const parsed = createNomenclatureSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const item = await db.materialNomenclature.create({
      data: {
        ...parsed.data,
        organizationId: session.user.organizationId,
      },
      select: { id: true, name: true, unit: true, category: true, vendorCode: true },
    });

    return successResponse(item);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания номенклатуры');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
