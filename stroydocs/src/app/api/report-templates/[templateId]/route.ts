import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { ReportBlockType } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface Params { templateId: string }

const blockDefinitionSchema = z.object({
  order: z.number().int().min(0),
  type: z.nativeEnum(ReportBlockType),
  title: z.string().min(1, 'Введите заголовок блока'),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1, 'Введите наименование шаблона').optional(),
  description: z.string().optional(),
  blockDefinitions: z.array(blockDefinitionSchema).min(1, 'Добавьте хотя бы один блок').optional(),
});

/** PATCH /api/report-templates/[templateId] — обновить шаблон организации */
export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { templateId } = params;

    const template = await db.reportTemplate.findFirst({
      where: { id: templateId },
      select: { id: true, isSystem: true, organizationId: true },
    });
    if (!template) return errorResponse('Шаблон не найден', 404);

    // Системные шаблоны нельзя редактировать
    if (template.isSystem) {
      return errorResponse('Системные шаблоны нельзя редактировать', 403);
    }

    // Шаблон должен принадлежать организации текущего пользователя
    if (template.organizationId !== orgId) {
      return errorResponse('Шаблон не найден', 404);
    }

    const body: unknown = await req.json();
    const parsed = updateTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { name, description, blockDefinitions } = parsed.data;

    const updated = await db.reportTemplate.update({
      where: { id: templateId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(blockDefinitions !== undefined ? { blockDefinitions } : {}),
      },
      include: {
        _count: { select: { reports: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления шаблона отчёта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** DELETE /api/report-templates/[templateId] — удалить шаблон организации */
export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { templateId } = params;

    const template = await db.reportTemplate.findFirst({
      where: { id: templateId },
      select: { id: true, isSystem: true, organizationId: true },
    });
    if (!template) return errorResponse('Шаблон не найден', 404);

    // Системные шаблоны нельзя удалять
    if (template.isSystem) {
      return errorResponse('Системные шаблоны нельзя удалять', 403);
    }

    // Шаблон должен принадлежать организации текущего пользователя
    if (template.organizationId !== orgId) {
      return errorResponse('Шаблон не найден', 404);
    }

    await db.reportTemplate.delete({ where: { id: templateId } });

    return successResponse({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления шаблона отчёта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
