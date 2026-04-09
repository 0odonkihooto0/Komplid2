import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { generateReportPdf } from '@/lib/reports/generate-report-pdf';
import { uploadFile, getDownloadUrl, buildS3Key } from '@/lib/s3-utils';
import { ReportStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface Params { projectId: string; reportId: string }

/** POST /api/projects/[projectId]/reports/[reportId]/generate-pdf
 *  Сгенерировать PDF отчёта, загрузить в S3, вернуть presigned URL */
export async function POST(_req: NextRequest, { params }: { params: Params }) {
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
      select: { id: true, number: true, name: true, pdfS3Key: true },
    });
    if (!report) return errorResponse('Отчёт не найден', 404);

    // Генерируем PDF
    const pdfBuffer = await generateReportPdf(reportId);

    // Загружаем в S3
    const fileName = `report-${report.number}-${Date.now()}.pdf`;
    const s3Key = buildS3Key(orgId, 'reports', fileName);
    await uploadFile(pdfBuffer, s3Key, 'application/pdf');

    // Обновляем запись отчёта
    await db.report.update({
      where: { id: reportId },
      data: {
        pdfS3Key: s3Key,
        fileName,
        status: ReportStatus.GENERATED,
      },
    });

    // Возвращаем presigned URL (TTL: 1 час)
    const url = await getDownloadUrl(s3Key);

    return successResponse({ url, fileName, s3Key });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации PDF отчёта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
