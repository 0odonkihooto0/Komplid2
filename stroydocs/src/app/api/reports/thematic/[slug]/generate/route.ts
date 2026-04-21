import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { generateThematicXlsx } from '@/lib/reports/generate-thematic-xlsx';
import { uploadFile, getDownloadUrl, buildS3Key } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';

interface Params { slug: string }

const generateThematicSchema = z.object({
  projectId: z.string().min(1, 'Укажите проект'),
  filters: z.object({
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    contractId: z.string().optional(),
  }).optional(),
});

/** POST /api/reports/thematic/[slug]/generate — сформировать тематический отчёт */
export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { slug } = params;

    // Проверяем что форма существует
    const config = await db.thematicReportConfig.findUnique({
      where: { slug },
      select: { id: true, name: true, isActive: true },
    });
    if (!config || !config.isActive) {
      return errorResponse('Тематическая форма не найдена', 404);
    }

    const body: unknown = await req.json();
    const parsed = generateThematicSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { projectId, filters } = parsed.data;

    // Проверяем что проект принадлежит воркспейсу/организации (multi-tenancy + workspace)
    const projectWhere = session.user.activeWorkspaceId
      ? { id: projectId, OR: [{ workspaceId: session.user.activeWorkspaceId }, { organizationId: orgId }] }
      : { id: projectId, organizationId: orgId };
    const project = await db.buildingObject.findFirst({ where: projectWhere, select: { id: true } });
    if (!project) return errorResponse('Проект не найден', 404);

    // Генерируем Excel
    const xlsxBuffer = await generateThematicXlsx(slug, projectId, filters ?? {});

    // Загружаем в S3
    const fileName = `thematic-${slug}-${Date.now()}.xlsx`;
    const s3Key = buildS3Key(orgId, 'thematic-reports', fileName);
    await uploadFile(
      xlsxBuffer,
      s3Key,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    // Возвращаем presigned URL (TTL: 1 час)
    const url = await getDownloadUrl(s3Key);

    return successResponse({ url, fileName, s3Key, reportName: config.name });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации тематического отчёта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
