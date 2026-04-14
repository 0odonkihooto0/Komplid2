import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST — импортировать шаблонные категории организации в проект.
 * Копирует дерево шаблонов (isTemplate=true, organizationId=orgId) в проект,
 * сохраняя иерархию через два прохода: сначала корни, потом дочерние.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Загружаем все шаблонные категории организации
    const templates = await db.idDocCategory.findMany({
      where: {
        organizationId: session.user.organizationId,
        isTemplate: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (templates.length === 0) {
      return successResponse({ imported: 0, message: 'Шаблонные категории не найдены' });
    }

    // Проверяем не импортированы ли уже (по совпадению имён корневых категорий)
    const rootTemplates = templates.filter((t) => !t.parentId);
    const existingNames = await db.idDocCategory.findMany({
      where: {
        projectId: params.projectId,
        parentId: null,
        name: { in: rootTemplates.map((t) => t.name) },
      },
      select: { name: true },
    });
    const existingNamesSet = new Set(existingNames.map((c) => c.name));

    // Первый проход — создаём корневые категории (parentId = null)
    const idMap = new Map<string, string>(); // templateId → newCategoryId
    let imported = 0;

    for (const tmpl of rootTemplates) {
      if (existingNamesSet.has(tmpl.name)) continue; // пропускаем дубликаты
      const created = await db.idDocCategory.create({
        data: {
          name: tmpl.name,
          sortOrder: tmpl.sortOrder,
          projectId: params.projectId,
          isTemplate: false,
        },
      });
      idMap.set(tmpl.id, created.id);
      imported++;
    }

    // Второй проход — создаём дочерние (BFS по уровням)
    const remaining = templates.filter((t) => t.parentId !== null);
    let iterations = 0;
    const maxIterations = 10; // защита от бесконечного цикла при некорректных данных

    while (remaining.length > 0 && iterations < maxIterations) {
      iterations++;
      let madeProgress = false;

      for (let i = remaining.length - 1; i >= 0; i--) {
        const tmpl = remaining[i];
        const newParentId = tmpl.parentId ? idMap.get(tmpl.parentId) : null;
        if (!newParentId) continue; // родитель ещё не создан

        const created = await db.idDocCategory.create({
          data: {
            name: tmpl.name,
            sortOrder: tmpl.sortOrder,
            parentId: newParentId,
            projectId: params.projectId,
            isTemplate: false,
          },
        });
        idMap.set(tmpl.id, created.id);
        remaining.splice(i, 1);
        imported++;
        madeProgress = true;
      }

      if (!madeProgress) break;
    }

    return successResponse({ imported });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка импорта шаблонных категорий ИД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
