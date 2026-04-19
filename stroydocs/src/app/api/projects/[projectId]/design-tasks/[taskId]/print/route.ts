import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse } from '@/utils/api';
import { generateDesignTaskPdf } from '@/lib/pir-pdf-generator';
import type { DesignTaskPdfData } from '@/lib/pir-pdf-generator';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; taskId: string } };

/** POST — генерация PDF Задания на проектирование (ЗП) или на изыскания (ЗИИ) */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const task = await db.designTask.findFirst({
      where: {
        id: params.taskId,
        projectId: params.projectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      include: {
        approvedBy: { select: { firstName: true, lastName: true } },
        agreedBy: { select: { firstName: true, lastName: true } },
        parameters: { orderBy: { order: 'asc' } },
      },
    });
    if (!task) return errorResponse('Задание не найдено', 404);

    const fmtName = (u: { firstName: string; lastName: string } | null) =>
      u ? `${u.lastName} ${u.firstName}` : '___________________';

    const data: DesignTaskPdfData = {
      number: task.number,
      date: task.docDate.toLocaleDateString('ru-RU'),
      isSurveyTask: task.taskType === 'SURVEY',
      approvedByName: fmtName(task.approvedBy),
      agreedByName: fmtName(task.agreedBy),
      parameters: task.parameters.map((p) => ({
        paramName: p.paramName,
        value: p.value ?? '',
      })),
      generatedAt: new Date().toLocaleString('ru-RU'),
    };

    const buffer = await generateDesignTaskPdf(data);
    const taskLabel = task.taskType === 'SURVEY' ? 'survey-task' : 'design-task';
    const filename = `${taskLabel}-${task.number.replace(/[^\w-]/g, '_')}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации PDF задания ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
