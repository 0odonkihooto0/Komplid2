import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { createProjectSchema } from '@/lib/validations/project';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// 7 папок по умолчанию для файлового хранилища проекта (создаются при POST /api/projects)
const DEFAULT_FOLDERS = [
  { name: 'Разрешительная документация', order: 0 },
  { name: 'Рабочий проект',              order: 1 },
  { name: 'Исполнительные схемы',        order: 2 },
  { name: 'Сертификаты качества',        order: 3 },
  { name: 'Нормативные документы',       order: 4 },
  { name: 'Протоколы совещаний',         order: 5 },
  { name: 'Прочее',                      order: 6 },
];

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const searchParams = req.nextUrl.searchParams;
    const search = (searchParams.get('search') || '').trim().slice(0, 100);
    const status = searchParams.get('status');
    const parsedLimit = parseInt(searchParams.get('limit') || '');
    const limit = Number.isNaN(parsedLimit) ? 50 : Math.max(1, Math.min(100, parsedLimit));

    // Backward compatible: workspaceId (новый) || organizationId (старый fallback)
    const workspaceFilter = session.user.activeWorkspaceId
      ? { OR: [{ workspaceId: session.user.activeWorkspaceId }, { organizationId: session.user.organizationId }] }
      : { organizationId: session.user.organizationId };

    const where = {
      ...workspaceFilter,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { address: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(status && { status: status as 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' }),
    };

    const projects = await db.buildingObject.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        _count: { select: { contracts: true } },
        contracts: {
          select: {
            workItems: {
              select: {
                id: true,
                workRecords: {
                  select: {
                    executionDocs: {
                      where: { status: 'SIGNED' },
                      select: { id: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Вычисляем процент готовности ИД: подписанные ИД / кол-во WorkItems * 100
    const result = projects.map(({ contracts, ...p }) => {
      const allWorkItems = contracts.flatMap((c) => c.workItems);
      const total = allWorkItems.length;
      const signed = allWorkItems.reduce(
        (sum, wi) => sum + wi.workRecords.reduce((s2, wr) => s2 + wr.executionDocs.length, 0),
        0
      );
      const idReadinessPercent = total > 0 ? Math.round((signed / total) * 100) : 0;
      return { ...p, idReadinessPercent };
    });

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения проектов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Создаём объект и папки по умолчанию атомарно в одной транзакции
    const project = await db.$transaction(async (tx) => {
      const created = await tx.buildingObject.create({
        data: {
          ...parsed.data,
          organizationId: session.user.organizationId,
          ...(session.user.activeWorkspaceId && { workspaceId: session.user.activeWorkspaceId }),
        },
      });

      await tx.projectFolder.createMany({
        data: DEFAULT_FOLDERS.map((f) => ({ ...f, projectId: created.id })),
      });

      return created;
    });

    return successResponse(project);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания проекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
