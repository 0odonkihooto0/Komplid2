import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { PIR_CATEGORY_PRESETS } from '@/lib/pir/pir-category-presets';

export const dynamic = 'force-dynamic';

// GET — вернуть конфиг ПИР с категориями (или null)
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const config = await db.pIRObjectTypeConfig.findUnique({
      where: { projectId: params.projectId },
      include: { categories: { orderBy: { order: 'asc' } } },
    });

    return successResponse(config);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения конфига ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const createConfigSchema = z.object({
  objectType: z.string().min(1, 'Тип объекта обязателен'),
});

// POST — создать конфиг и заполнить предустановленные категории
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверить что конфига ещё нет
    const existing = await db.pIRObjectTypeConfig.findUnique({
      where: { projectId: params.projectId },
      select: { id: true },
    });
    if (existing) return errorResponse('Конфигурация ПИР уже существует', 409);

    const body = await req.json();
    const parsed = createConfigSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { objectType } = parsed.data;
    const presets = PIR_CATEGORY_PRESETS[objectType] ?? [];

    const config = await db.pIRObjectTypeConfig.create({
      data: {
        objectType,
        projectId: params.projectId,
        categories: {
          createMany: {
            data: presets,
          },
        },
      },
      include: { categories: { orderBy: { order: 'asc' } } },
    });

    return successResponse(config);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания конфига ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
