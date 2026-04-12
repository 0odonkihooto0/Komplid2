import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const createChapterSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(500),
  code: z.string().max(20).optional(),
  level: z.number().int().min(0).optional(),
  parentId: z.string().uuid().optional(),
  order: z.number().int().min(0).optional(),
});

/** GET — дерево глав версии сметы с позициями */
export async function GET(
  _req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; versionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const version = await db.estimateVersion.findFirst({
      where: { id: params.versionId, contractId: params.contractId },
    });
    if (!version) return errorResponse('Версия не найдена', 404);

    // Загружаем корневые главы с подглавами и позициями (дерево)
    const chapters = await db.estimateChapter.findMany({
      where: { versionId: params.versionId, parentId: null },
      orderBy: { order: 'asc' },
      include: {
        items: {
          where: { isDeleted: false },
          orderBy: { sortOrder: 'asc' },
        },
        children: {
          orderBy: { order: 'asc' },
          include: {
            items: {
              where: { isDeleted: false },
              orderBy: { sortOrder: 'asc' },
            },
            children: {
              orderBy: { order: 'asc' },
              include: {
                items: {
                  where: { isDeleted: false },
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    return successResponse(chapters);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка загрузки глав сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST — добавить главу / раздел в версию сметы */
export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; versionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const version = await db.estimateVersion.findFirst({
      where: { id: params.versionId, contractId: params.contractId },
    });
    if (!version) return errorResponse('Версия не найдена', 404);

    if (version.isBaseline) {
      return errorResponse('Нельзя изменять базовую версию (Baseline)', 400);
    }

    const body = await req.json();
    const parsed = createChapterSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const data = parsed.data;

    // Если порядок не передан — ставим в конец
    let order = data.order;
    if (order === undefined) {
      const lastChapter = await db.estimateChapter.findFirst({
        where: { versionId: params.versionId, parentId: data.parentId ?? null },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      order = (lastChapter?.order ?? -1) + 1;
    }

    // Уровень: из запроса или автоматически (0 — корневая, 1 — подраздел)
    const level = data.level ?? (data.parentId ? 1 : 0);

    const chapter = await db.estimateChapter.create({
      data: {
        name: data.name,
        code: data.code ?? null,
        order,
        level,
        versionId: params.versionId,
        parentId: data.parentId ?? null,
      },
    });

    return successResponse(chapter);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания главы сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
