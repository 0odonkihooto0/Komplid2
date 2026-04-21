import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { getThematicData } from '@/lib/reports/get-thematic-data';

export const dynamic = 'force-dynamic';

interface Params {
  slug: string;
}

const bodySchema = z.object({
  projectId: z.string().min(1, 'projectId обязателен'),
  filters: z
    .object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      contractId: z.string().optional(),
    })
    .optional(),
});

/**
 * POST /api/reports/thematic/[slug]/data
 * Возвращает данные тематического отчёта в виде массива строк.
 * Используется для предпросмотра отчёта перед генерацией XLSX.
 */
export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const { slug } = params;

    // Проверяем что конфиг тематического отчёта существует и активен
    const config = await db.thematicReportConfig.findFirst({
      where: { slug, isActive: true },
    });
    if (!config) return errorResponse('Тематический отчёт не найден', 404);

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { projectId, filters } = parsed.data;

    // Проверка принадлежности объекта строительства (multi-tenancy + workspace)
    const objWhere = session.user.activeWorkspaceId
      ? { id: projectId, OR: [{ workspaceId: session.user.activeWorkspaceId }, { organizationId: session.user.organizationId }] }
      : { id: projectId, organizationId: session.user.organizationId };
    const buildingObject = await db.buildingObject.findFirst({ where: objWhere });
    if (!buildingObject) return errorResponse('Объект не найден', 404);

    const rows = await getThematicData(slug, projectId, filters ?? {});

    return successResponse({ rows, total: rows.length });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения данных тематического отчёта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
