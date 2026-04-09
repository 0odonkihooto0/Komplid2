import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// GET — 6 виджетов аналитики модуля ПИР
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

    const [
      docsByStatus,
      docsByApprovalRoute,
      docCommentsByStatus,
      taskCommentsByStatus,
      docsByType,
      commentsByAuthor,
      commentsByAssignee,
    ] = await Promise.all([
      // Виджет 1: Документов по статусам
      db.designDocument.groupBy({
        by: ['status'],
        where: { projectId: params.projectId, isDeleted: false },
        _count: { id: true },
      }),

      // Виджет 2: Документов по статусам согласования (через back-relation designDoc)
      db.approvalRoute.findMany({
        where: { designDoc: { projectId: params.projectId, isDeleted: false } },
        select: { status: true },
      }),

      // Виджет 3a: Замечания к документам по статусам
      db.designDocComment.groupBy({
        by: ['status'],
        where: { doc: { projectId: params.projectId, isDeleted: false } },
        _count: { id: true },
      }),

      // Виджет 3b: Замечания к заданиям по статусам
      db.designTaskComment.groupBy({
        by: ['status'],
        where: { task: { projectId: params.projectId } },
        _count: { id: true },
      }),

      // Виджет 4: Документов по типам
      db.designDocument.groupBy({
        by: ['docType'],
        where: { projectId: params.projectId, isDeleted: false },
        _count: { id: true },
      }),

      // Виджет 5: Топ-10 авторов замечаний к документам
      db.designDocComment.groupBy({
        by: ['authorId'],
        where: { doc: { projectId: params.projectId, isDeleted: false } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      // Виджет 6: Топ-10 ответственных по замечаниям к документам
      db.designDocComment.groupBy({
        by: ['assigneeId'],
        where: {
          doc: { projectId: params.projectId, isDeleted: false },
          assigneeId: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    // Постобработка виджета 2: подсчёт по статусам согласования
    const approvalStatusMap: Record<string, number> = {};
    for (const r of docsByApprovalRoute) {
      approvalStatusMap[r.status] = (approvalStatusMap[r.status] ?? 0) + 1;
    }

    // Постобработка виджета 3: слияние замечаний документов и заданий
    const mergedComments: Record<string, number> = {};
    const allCommentGroups: Array<{ status: string; _count: { id: number } }> = [
      ...docCommentsByStatus,
      ...taskCommentsByStatus,
    ];
    for (const r of allCommentGroups) {
      mergedComments[r.status] = (mergedComments[r.status] ?? 0) + r._count.id;
    }

    // Обогатить виджеты 5 и 6 именами пользователей (один batch-запрос)
    const authorIds = (commentsByAuthor as Array<{ authorId: string; _count: { id: number } }>).map((r) => r.authorId);
    const assigneeIds = (commentsByAssignee as Array<{ assigneeId: string | null; _count: { id: number } }>)
      .map((r) => r.assigneeId)
      .filter((id): id is string => id !== null);
    const allUserIds = Array.from(new Set([...authorIds, ...assigneeIds]));

    const users = await db.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    type UserInfo = { id: string; firstName: string; lastName: string };
    const userMap = Object.fromEntries(
      (users as UserInfo[]).map((u: UserInfo) => [u.id, u])
    );

    return successResponse({
      // Виджет 1
      docsByStatus: (docsByStatus as Array<{ status: string; _count: { id: number } }>).map(
        (r: { status: string; _count: { id: number } }) => ({ status: r.status, count: r._count.id })
      ),
      // Виджет 2
      docsByApprovalStatus: Object.entries(approvalStatusMap).map(([status, count]) => ({
        status,
        count,
      })),
      // Виджет 3
      commentsByStatus: Object.entries(mergedComments).map(([status, count]) => ({
        status,
        count,
      })),
      // Виджет 4
      docsByType: (docsByType as Array<{ docType: string; _count: { id: number } }>).map(
        (r: { docType: string; _count: { id: number } }) => ({ docType: r.docType, count: r._count.id })
      ),
      // Виджет 5
      topAuthors: (commentsByAuthor as Array<{ authorId: string; _count: { id: number } }>).map((r) => ({
        user: userMap[r.authorId] ?? null,
        count: r._count.id,
      })),
      // Виджет 6
      topAssignees: (commentsByAssignee as Array<{ assigneeId: string | null; _count: { id: number } }>).map((r) => ({
        user: r.assigneeId ? (userMap[r.assigneeId] ?? null) : null,
        count: r._count.id,
      })),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка аналитики ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
