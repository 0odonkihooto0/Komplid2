import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { generateAiWeeklySummary } from '@/lib/reports/ai-weekly-summary';
import { ReportBlockType } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface Params { projectId: string }

const bodySchema = z.object({
  weekStart: z.string().datetime({ offset: true }).optional(),
  reportId: z.string().uuid().optional(),
});

/**
 * POST /api/projects/[projectId]/reports/ai-summary
 * Генерирует AI-сводку хода строительства за неделю.
 * Если передан reportId — вставляет сводку как блок FREE_TEXT в отчёт.
 */
export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId } = params;

    // Проверяем принадлежность объекта к организации
    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { weekStart: weekStartStr, reportId } = parsed.data;
    const weekStart = weekStartStr ? new Date(weekStartStr) : undefined;

    // Генерируем AI-сводку
    const result = await generateAiWeeklySummary(projectId, orgId, weekStart);

    // Если указан reportId — вставляем сводку как FREE_TEXT блок в отчёт
    if (reportId) {
      const report = await db.report.findFirst({
        where: { id: reportId, projectId },
        include: {
          blocks: {
            where: { type: ReportBlockType.FREE_TEXT },
            orderBy: { order: 'desc' },
            take: 1,
          },
        },
      });

      if (report) {
        const existingFreeText = report.blocks[0];
        const weekLabel = `AI-сводка за ${result.weekStart.toLocaleDateString('ru-RU')} — ${result.weekEnd.toLocaleDateString('ru-RU')}`;

        if (existingFreeText) {
          // Обновляем существующий FREE_TEXT блок
          await db.reportBlock.update({
            where: { id: existingFreeText.id },
            data: {
              title: weekLabel,
              content: { text: result.summary },
              isAutoFilled: true,
            },
          });
        } else {
          // Создаём новый FREE_TEXT блок в конце отчёта
          const maxOrder = await db.reportBlock.aggregate({
            where: { reportId },
            _max: { order: true },
          });
          await db.reportBlock.create({
            data: {
              reportId,
              type: ReportBlockType.FREE_TEXT,
              title: weekLabel,
              content: { text: result.summary },
              order: (maxOrder._max.order ?? 0) + 1,
              isAutoFilled: true,
            },
          });
        }
      }
    }

    logger.info({ projectId, dataCollected: result.dataCollected }, 'AI-сводка сгенерирована');
    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации AI-сводки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
