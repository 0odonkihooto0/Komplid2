import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

interface Params { projectId: string }

// Рекурсивный тип для дерева категорий
type CategoryWithChildren = {
  id: string;
  name: string;
  order: number;
  parentId: string | null;
  createdAt: Date;
  children: CategoryWithChildren[];
};

/** Преобразовать плоский список в дерево */
function buildTree(flat: Omit<CategoryWithChildren, 'children'>[]): CategoryWithChildren[] {
  const map = new Map<string, CategoryWithChildren>();
  const roots: CategoryWithChildren[] = [];

  for (const cat of flat) {
    map.set(cat.id, { ...cat, children: [] });
  }
  for (const cat of flat) {
    const node = map.get(cat.id)!;
    if (cat.parentId) {
      const parent = map.get(cat.parentId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/** GET /api/projects/[projectId]/reports/categories — дерево категорий */
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId } = params;

    // Проверяем доступ к проекту
    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const categories = await db.reportCategory.findMany({
      where: { projectId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    return successResponse(buildTree(categories));
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения категорий отчётов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const createCategorySchema = z.object({
  name: z.string().min(1, 'Введите название категории'),
  parentId: z.string().optional(),
  order: z.number().int().optional(),
});

/** POST /api/projects/[projectId]/reports/categories — создать категорию */
export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId } = params;

    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body: unknown = await req.json();
    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { name, parentId, order } = parsed.data;

    // Если указан parentId — проверить что родитель принадлежит тому же проекту
    if (parentId) {
      const parent = await db.reportCategory.findFirst({
        where: { id: parentId, projectId },
        select: { id: true },
      });
      if (!parent) return errorResponse('Родительская категория не найдена', 404);
    }

    const category = await db.reportCategory.create({
      data: { name, parentId: parentId ?? null, order: order ?? 0, projectId },
    });

    return successResponse(category);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания категории отчётов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
