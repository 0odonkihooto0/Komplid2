import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { buildTaskVisibilityWhere } from '@/lib/task-visibility';
interface FeedItem {
  type: 'task_created' | 'report_added';
  id: string;
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  taskLabels: Array<{ id: string; name: string; color: string }>;
  taskDescription: string | null;
  author: { id: string; firstName: string; lastName: string };
  content: string | null;
  timestamp: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const userId = session.user.id;
    const { searchParams } = new URL(req.url);

    const grouping = searchParams.get('grouping') ?? 'all';
    const groupId = searchParams.get('groupId');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));

    const visibilityWhere = buildTaskVisibilityWhere(userId, orgId);

    const groupingFilter =
      grouping === 'executor' ? { roles: { some: { userId, role: 'EXECUTOR' as const } } }
      : grouping === 'controller' ? { roles: { some: { userId, role: 'CONTROLLER' as const } } }
      : grouping === 'observer' ? { roles: { some: { userId, role: 'OBSERVER' as const } } }
      : grouping === 'author' ? { OR: [{ createdById: userId }, { roles: { some: { userId, role: 'AUTHOR' as const } } }] }
      : grouping === 'completed' ? { status: 'DONE' as const }
      : grouping === 'irrelevant' ? { status: 'IRRELEVANT' as const }
      : {};

    const taskWhere = {
      ...visibilityWhere,
      ...groupingFilter,
      ...(groupId ? { groupId } : {}),
      ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
    };

    const fetchCount = pageSize * 2;

    const [recentTasks, recentReports] = await Promise.all([
      db.task.findMany({
        where: taskWhere,
        orderBy: { createdAt: 'desc' },
        take: fetchCount,
        select: {
          id: true,
          title: true,
          status: true,
          description: true,
          createdAt: true,
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          labels: { include: { label: { select: { id: true, name: true, color: true } } } },
        },
      }),
      db.taskReport.findMany({
        where: { task: taskWhere },
        orderBy: { createdAt: 'desc' },
        take: fetchCount,
        select: {
          id: true,
          progress: true,
          createdAt: true,
          author: { select: { id: true, firstName: true, lastName: true } },
          task: {
            select: {
              id: true,
              title: true,
              status: true,
              description: true,
              labels: { include: { label: { select: { id: true, name: true, color: true } } } },
            },
          },
        },
      }),
    ]);

    const taskItems: FeedItem[] = recentTasks.map((t) => ({
      type: 'task_created',
      id: `task-${t.id}`,
      taskId: t.id,
      taskTitle: t.title,
      taskStatus: t.status,
      taskLabels: t.labels.map((l) => l.label),
      taskDescription: t.description,
      author: t.createdBy,
      content: null,
      timestamp: t.createdAt.toISOString(),
    }));

    const reportItems: FeedItem[] = recentReports.map((r) => ({
      type: 'report_added',
      id: `report-${r.id}`,
      taskId: r.task.id,
      taskTitle: r.task.title,
      taskStatus: r.task.status,
      taskLabels: r.task.labels.map((l) => l.label),
      taskDescription: r.task.description,
      author: r.author,
      content: r.progress,
      timestamp: r.createdAt.toISOString(),
    }));

    const combined = [...taskItems, ...reportItems]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice((page - 1) * pageSize, page * pageSize);

    return successResponse(combined);
  } catch (err) {
    console.error('[tasks/feed] GET:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}
