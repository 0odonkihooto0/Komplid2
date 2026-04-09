import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { ReportBlockType } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface Params { projectId: string }

const createFromTemplateSchema = z.object({
  templateId: z.string().min(1, 'Укажите шаблон'),
  name: z.string().min(1, 'Введите наименование отчёта'),
  categoryId: z.string().optional(),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
});

// Тип определения блока в шаблоне
interface BlockDefinition {
  order: number;
  type: string;
  title: string;
}

/** POST /api/projects/[projectId]/reports/from-template — создать отчёт из шаблона */
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
    const parsed = createFromTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { templateId, name, categoryId, periodStart, periodEnd } = parsed.data;

    // Загружаем шаблон (системный или принадлежащий организации)
    const template = await db.reportTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ isSystem: true }, { organizationId: orgId }],
      },
    });
    if (!template) return errorResponse('Шаблон не найден', 404);

    // Проверяем категорию если указана
    if (categoryId) {
      const cat = await db.reportCategory.findFirst({
        where: { id: categoryId, projectId },
        select: { id: true },
      });
      if (!cat) return errorResponse('Категория не найдена', 404);
    }

    // Авто-инкремент номера
    const lastReport = await db.report.findFirst({
      where: { projectId },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const number = (lastReport?.number ?? 0) + 1;

    // Парсим определения блоков из шаблона
    const blockDefinitions = (template.blockDefinitions as unknown as BlockDefinition[]) ?? [];

    // Создаём отчёт вместе с блоками из шаблона
    const report = await db.report.create({
      data: {
        name,
        number,
        projectId,
        authorId: session.user.id,
        templateId,
        categoryId: categoryId ?? null,
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        blocks: {
          create: blockDefinitions.map((def) => ({
            order: def.order,
            type: def.type as ReportBlockType,
            title: def.title,
          })),
        },
      },
      include: {
        blocks: { orderBy: { order: 'asc' } },
        author: { select: { id: true, firstName: true, lastName: true } },
        category: { select: { id: true, name: true } },
      },
    });

    return successResponse(report);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания отчёта из шаблона');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
