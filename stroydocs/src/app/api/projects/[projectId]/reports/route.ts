import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { ReportStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface Params { projectId: string }

const REPORT_INCLUDE = {
  author: { select: { id: true, firstName: true, lastName: true } },
  category: { select: { id: true, name: true } },
  _count: { select: { blocks: true } },
} as const;

/** GET /api/projects/[projectId]/reports — список отчётов */
export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId } = params;

    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const url = new URL(req.url);
    const categoryId = url.searchParams.get('categoryId') ?? undefined;
    const status = url.searchParams.get('status') ?? undefined;
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50')));
    const skip = (page - 1) * limit;

    const where = {
      projectId,
      ...(categoryId ? { categoryId } : {}),
      ...(status ? { status: status as ReportStatus } : {}),
    };

    const [reports, total] = await Promise.all([
      db.report.findMany({
        where,
        include: REPORT_INCLUDE,
        orderBy: { number: 'desc' },
        take: limit,
        skip,
      }),
      db.report.count({ where }),
    ]);

    return successResponse({ data: reports, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения списка отчётов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const createReportSchema = z.object({
  name: z.string().min(1, 'Введите наименование отчёта'),
  categoryId: z.string().optional(),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
});

/** POST /api/projects/[projectId]/reports — создать отчёт */
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
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Проверить категорию если указана
    if (parsed.data.categoryId) {
      const cat = await db.reportCategory.findFirst({
        where: { id: parsed.data.categoryId, projectId },
        select: { id: true },
      });
      if (!cat) return errorResponse('Категория не найдена', 404);
    }

    // Авто-инкремент номера в рамках проекта
    const lastReport = await db.report.findFirst({
      where: { projectId },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const number = (lastReport?.number ?? 0) + 1;

    const report = await db.report.create({
      data: {
        name: parsed.data.name,
        number,
        projectId,
        authorId: session.user.id,
        categoryId: parsed.data.categoryId ?? null,
        periodStart: parsed.data.periodStart ? new Date(parsed.data.periodStart) : null,
        periodEnd: parsed.data.periodEnd ? new Date(parsed.data.periodEnd) : null,
      },
      include: REPORT_INCLUDE,
    });

    return successResponse(report);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания отчёта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
