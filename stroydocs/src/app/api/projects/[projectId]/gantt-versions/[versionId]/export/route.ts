import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse } from '@/utils/api';
import { exportGprToExcel, exportGprToExcelWithDeps } from '@/lib/gantt/export-gpr';
import { exportGprToPdf } from '@/lib/gantt/export-gpr-pdf';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  format: z.enum(['excel', 'excel_deps', 'pdf']),
});

/**
 * GET /api/projects/[projectId]/gantt-versions/[versionId]/export?format=excel|excel_deps|pdf
 * Экспорт ГПР в Excel, Excel с зависимостями или PDF.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; versionId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка версии ГПР и принадлежности к организации
    const version = await db.ganttVersion.findFirst({
      where: {
        id: params.versionId,
        projectId: params.projectId,
        project: { organizationId: session.user.organizationId },
      },
      select: { name: true },
    });
    if (!version) return errorResponse('Версия ГПР не найдена', 404);

    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = querySchema.safeParse(searchParams);
    if (!parsed.success) {
      return errorResponse('Неверный формат. Допустимые: excel, excel_deps, pdf', 400);
    }

    const { format } = parsed.data;
    let buffer: Buffer;
    let contentType: string;
    let fileExt: string;

    switch (format) {
      case 'excel':
        buffer = await exportGprToExcel(params.versionId);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileExt = 'xlsx';
        break;
      case 'excel_deps':
        buffer = await exportGprToExcelWithDeps(params.versionId);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileExt = 'xlsx';
        break;
      case 'pdf':
        buffer = await exportGprToPdf(params.versionId);
        contentType = 'application/pdf';
        fileExt = 'pdf';
        break;
    }

    const filename = encodeURIComponent(`ГПР_${version.name}.${fileExt}`);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка экспорта ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
