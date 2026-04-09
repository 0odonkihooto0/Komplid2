import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { Prisma, ReportBlockType } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface Params { projectId: string; reportId: string }

/** Проверить доступ к отчёту */
async function checkReportAccess(projectId: string, reportId: string, orgId: string) {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId: orgId },
    select: { id: true },
  });
  if (!project) return false;

  const report = await db.report.findFirst({
    where: { id: reportId, projectId },
    select: { id: true },
  });
  return !!report;
}

/** GET /api/projects/[projectId]/reports/[reportId]/blocks — список блоков */
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId, reportId } = params;

    const hasAccess = await checkReportAccess(projectId, reportId, orgId);
    if (!hasAccess) return errorResponse('Отчёт не найден', 404);

    const blocks = await db.reportBlock.findMany({
      where: { reportId },
      orderBy: { order: 'asc' },
    });

    return successResponse(blocks);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения блоков отчёта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const createBlockSchema = z.object({
  type: z.nativeEnum(ReportBlockType),
  title: z.string().min(1, 'Введите заголовок блока'),
  order: z.number().int().min(0),
  content: z.record(z.string(), z.unknown()).optional(),
});

/** POST /api/projects/[projectId]/reports/[reportId]/blocks — добавить блок */
export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId, reportId } = params;

    const hasAccess = await checkReportAccess(projectId, reportId, orgId);
    if (!hasAccess) return errorResponse('Отчёт не найден', 404);

    const body: unknown = await req.json();
    const parsed = createBlockSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { type, title, order, content } = parsed.data;

    const block = await db.reportBlock.create({
      data: {
        reportId,
        type,
        title,
        order,
        content: content !== undefined ? content as Prisma.InputJsonValue : Prisma.JsonNull,
      },
    });

    return successResponse(block);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания блока отчёта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
