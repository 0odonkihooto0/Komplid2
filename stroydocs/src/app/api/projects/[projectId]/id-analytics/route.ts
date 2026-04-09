import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// GET — аналитика исполнительной документации (4 виджета)
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

    const projectId = params.projectId;

    const [
      docsByStatus,
      docsByAuthorAndStatus,
      commentsByStatus,
      commentsByAuthor,
      ganttStages,
    ] = await Promise.all([
      // Виджет 2: Статусы актов ИД
      db.executionDoc.groupBy({
        by: ['status'],
        where: { contract: { projectId } },
        _count: { id: true },
      }),

      // Виджет 3: ИД по авторам (stacked по статусу)
      db.executionDoc.groupBy({
        by: ['createdById', 'status'],
        where: { contract: { projectId } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 50,
      }),

      // Виджет 4a: Замечания по статусам
      db.docComment.groupBy({
        by: ['status'],
        where: { executionDoc: { contract: { projectId } } },
        _count: { id: true },
      }),

      // Виджет 4b: Топ-10 авторов замечаний
      db.docComment.groupBy({
        by: ['authorId'],
        where: { executionDoc: { contract: { projectId } } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      // Виджет 1: Готовность ИД по стадиям ГПР
      db.ganttStage.findMany({
        where: { projectId },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          name: true,
          versions: {
            select: {
              tasks: {
                select: {
                  id: true,
                  execDocs: {
                    select: {
                      execDoc: {
                        select: { status: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    // Постобработка виджета 1: % готовности по стадиям
    const gprReadiness = ganttStages.map((stage) => {
      const allTasks = stage.versions.flatMap((v) => v.tasks);
      const totalTasks = allTasks.length;
      // Считаем задачи у которых есть хотя бы один подписанный акт
      const tasksWithSignedDoc = allTasks.filter((t) =>
        t.execDocs.some((link) => link.execDoc.status === 'SIGNED'),
      ).length;
      const readinessPercent = totalTasks > 0
        ? Math.round((tasksWithSignedDoc / totalTasks) * 100)
        : 0;
      return {
        stageName: stage.name,
        totalTasks,
        signedDocs: tasksWithSignedDoc,
        readinessPercent,
      };
    });

    // Постобработка виджета 2: статусы
    type StatusGroup = { status: string; _count: { id: number } };
    const statusResult = (docsByStatus as StatusGroup[]).map((r) => ({
      status: r.status,
      count: r._count.id,
    }));

    // Постобработка виджета 3: ИД по авторам
    type AuthorStatusGroup = { createdById: string; status: string; _count: { id: number } };
    const authorGroups = docsByAuthorAndStatus as unknown as AuthorStatusGroup[];
    const authorIds = Array.from(new Set(authorGroups.map((r) => r.createdById)));

    // Виджет 4b: ID авторов замечаний
    type CommentAuthorGroup = { authorId: string; _count: { id: number } };
    const commentAuthorIds = (commentsByAuthor as CommentAuthorGroup[]).map((r) => r.authorId);

    // Один batch-запрос для всех пользователей
    const allUserIds = Array.from(new Set([...authorIds, ...commentAuthorIds]));
    const users = allUserIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: allUserIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, `${u.lastName} ${u.firstName}`]));

    // Сборка виджета 3: группировка по автору, stacked по статусам
    const authorMap = new Map<string, { signed: number; inReview: number; draft: number; rejected: number }>();
    for (const r of authorGroups) {
      if (!authorMap.has(r.createdById)) {
        authorMap.set(r.createdById, { signed: 0, inReview: 0, draft: 0, rejected: 0 });
      }
      const entry = authorMap.get(r.createdById)!;
      switch (r.status) {
        case 'SIGNED': entry.signed += r._count.id; break;
        case 'IN_REVIEW': entry.inReview += r._count.id; break;
        case 'DRAFT': entry.draft += r._count.id; break;
        case 'REJECTED': entry.rejected += r._count.id; break;
      }
    }
    const docsByAuthorResult = Array.from(authorMap.entries()).map(([userId, counts]) => ({
      userName: userMap.get(userId) ?? 'Неизвестный',
      ...counts,
    }));

    // Постобработка виджета 4
    const commentsStatusResult = (commentsByStatus as StatusGroup[]).map((r) => ({
      status: r.status,
      count: r._count.id,
    }));

    const commentsAuthorResult = (commentsByAuthor as CommentAuthorGroup[]).map((r) => ({
      userName: userMap.get(r.authorId) ?? 'Неизвестный',
      count: r._count.id,
    }));

    return successResponse({
      gprReadiness,
      docsByStatus: statusResult,
      docsByAuthor: docsByAuthorResult,
      commentsByStatus: commentsStatusResult,
      commentsByAuthor: commentsAuthorResult,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка аналитики ИД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
