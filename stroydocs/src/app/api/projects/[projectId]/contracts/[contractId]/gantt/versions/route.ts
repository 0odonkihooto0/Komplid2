import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; contractId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const versions = await db.ganttVersion.findMany({
      where: { contractId: params.contractId },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(versions);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения версий графика');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const createVersionSchema = z.object({
  name: z.string().min(1).max(200),
  isBaseline: z.boolean().optional().default(false),
  copyFromVersionId: z.string().uuid().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createVersionSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { name, isBaseline, copyFromVersionId } = parsed.data;

    const version = await db.$transaction(async (tx) => {
      // Если создаём активную версию — снимаем флаг с остальных
      await tx.ganttVersion.updateMany({
        where: { contractId: params.contractId, isActive: true },
        data: { isActive: false },
      });

      const newVersion = await tx.ganttVersion.create({
        data: {
          name,
          isBaseline: isBaseline ?? false,
          isActive: true,
          contractId: params.contractId,
          createdById: session.user.id,
        },
      });

      // Копирование задач из другой версии
      if (copyFromVersionId) {
        const sourceTasks = await tx.ganttTask.findMany({
          where: { versionId: copyFromVersionId },
          orderBy: { sortOrder: 'asc' },
        });

        // Создаём маппинг старых id → новых для восстановления иерархии
        const idMap = new Map<string, string>();
        for (const t of sourceTasks) {
          const created = await tx.ganttTask.create({
            data: {
              name: t.name,
              sortOrder: t.sortOrder,
              level: t.level,
              status: t.status,
              planStart: t.planStart,
              planEnd: t.planEnd,
              progress: 0,
              isCritical: false,
              versionId: newVersion.id,
              workItemId: t.workItemId,
              contractId: params.contractId,
            },
          });
          idMap.set(t.id, created.id);
        }

        // Обновляем parentId через маппинг
        await Promise.all(
          sourceTasks
            .filter((t) => t.parentId && idMap.has(t.parentId))
            .map((t) =>
              tx.ganttTask.update({
                where: { id: idMap.get(t.id)! },
                data: { parentId: idMap.get(t.parentId) },
              })
            )
        );
      }

      return newVersion;
    });

    return successResponse(version);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания версии графика');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
