import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import type { DefectCategory, DefectStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface DrillDefect {
  id: string;
  title: string;
  status: string;
  category: string;
  deadline: string | null;
  resolvedAt: string | null;
  buildingObject: { id: string; name: string };
  assignee: { id: string; firstName: string; lastName: string } | null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const { searchParams } = req.nextUrl;
    const category = searchParams.get('category') ?? undefined;
    const statusParams = searchParams.getAll('status[]');
    const objectIdParams = searchParams.getAll('objectIds[]');

    // Нормализуем массивы параметров
    const statuses = statusParams.filter(Boolean);
    const objectIds = objectIdParams.filter(Boolean);

    const defects = await db.defect.findMany({
      where: {
        buildingObject: {
          organizationId: orgId,
          ...(objectIds.length > 0 ? { id: { in: objectIds } } : {}),
        },
        ...(category ? { category: category as DefectCategory } : {}),
        ...(statuses.length > 0 ? { status: { in: statuses as DefectStatus[] } } : {}),
      },
      select: {
        id: true,
        title: true,
        status: true,
        category: true,
        deadline: true,
        resolvedAt: true,
        buildingObject: {
          select: {
            id: true,
            name: true,
          },
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Приводим к интерфейсу DrillDefect (Date → ISO string через JSON-сериализацию)
    const result: DrillDefect[] = defects.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      category: d.category,
      deadline: d.deadline ? d.deadline.toISOString() : null,
      resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : null,
      buildingObject: d.buildingObject,
      assignee: d.assignee ?? null,
    }));

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения drill-down данных СК мониторинга');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
