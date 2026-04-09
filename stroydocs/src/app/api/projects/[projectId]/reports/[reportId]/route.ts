import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { ReportStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface Params { projectId: string; reportId: string }

/** Проверить доступ к проекту и получить отчёт */
async function getReportOrThrow(projectId: string, reportId: string, orgId: string) {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId: orgId },
    select: { id: true },
  });
  if (!project) return null;

  return db.report.findFirst({
    where: { id: reportId, projectId },
    include: {
      blocks: { orderBy: { order: 'asc' } },
      author: { select: { id: true, firstName: true, lastName: true } },
      category: { select: { id: true, name: true } },
      template: { select: { id: true, name: true } },
    },
  });
}

/** GET /api/projects/[projectId]/reports/[reportId] — карточка отчёта с блоками */
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId, reportId } = params;

    const report = await getReportOrThrow(projectId, reportId, orgId);
    if (!report) return errorResponse('Отчёт не найден', 404);

    return successResponse(report);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения отчёта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const updateReportSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.nativeEnum(ReportStatus).optional(),
  categoryId: z.string().nullable().optional(),
  periodStart: z.string().datetime().nullable().optional(),
  periodEnd: z.string().datetime().nullable().optional(),
});

/** PATCH /api/projects/[projectId]/reports/[reportId] — обновить отчёт */
export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId, reportId } = params;

    // Проверяем доступ к проекту
    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const report = await db.report.findFirst({
      where: { id: reportId, projectId },
      select: { id: true },
    });
    if (!report) return errorResponse('Отчёт не найден', 404);

    const body: unknown = await req.json();
    const parsed = updateReportSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { name, status, categoryId, periodStart, periodEnd } = parsed.data;

    const updated = await db.report.update({
      where: { id: reportId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(periodStart !== undefined ? { periodStart: periodStart ? new Date(periodStart) : null } : {}),
        ...(periodEnd !== undefined ? { periodEnd: periodEnd ? new Date(periodEnd) : null } : {}),
      },
      include: {
        blocks: { orderBy: { order: 'asc' } },
        author: { select: { id: true, firstName: true, lastName: true } },
        category: { select: { id: true, name: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления отчёта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** DELETE /api/projects/[projectId]/reports/[reportId] — удалить отчёт */
export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId, reportId } = params;

    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const report = await db.report.findFirst({
      where: { id: reportId, projectId },
      select: { id: true },
    });
    if (!report) return errorResponse('Отчёт не найден', 404);

    await db.report.delete({ where: { id: reportId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления отчёта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
