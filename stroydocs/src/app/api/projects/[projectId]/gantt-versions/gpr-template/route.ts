import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { generateGprExcelTemplate } from '@/lib/gantt/gpr-excel-template';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[projectId]/gantt-versions/gpr-template
 * Скачивание Excel-шаблона для импорта ГПР.
 */
export async function GET(
  _req: NextRequest,
  { params: _params }: { params: { projectId: string } },
) {
  try {
    await getSessionOrThrow();

    const buffer = await generateGprExcelTemplate();

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          "attachment; filename*=UTF-8''%D0%A8%D0%B0%D0%B1%D0%BB%D0%BE%D0%BD_%D0%93%D0%9F%D0%A0.xlsx",
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации шаблона ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
