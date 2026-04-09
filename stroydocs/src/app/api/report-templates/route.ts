import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { Prisma, ReportBlockType } from '@prisma/client';

export const dynamic = 'force-dynamic';

const TEMPLATE_INCLUDE = {
  _count: { select: { reports: true } },
} as const;

/** GET /api/report-templates — системные шаблоны и шаблоны организации */
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50')));
    const skip = (page - 1) * limit;

    // Возвращаем системные шаблоны и шаблоны текущей организации
    const where = {
      OR: [
        { isSystem: true },
        { organizationId: orgId },
      ],
    };

    const [templates, total] = await Promise.all([
      db.reportTemplate.findMany({
        where,
        include: TEMPLATE_INCLUDE,
        orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
        take: limit,
        skip,
      }),
      db.reportTemplate.count({ where }),
    ]);

    return successResponse({ data: templates, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения шаблонов отчётов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const blockDefinitionSchema = z.object({
  order: z.number().int().min(0),
  type: z.nativeEnum(ReportBlockType),
  title: z.string().min(1, 'Введите заголовок блока'),
});

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Введите наименование шаблона'),
  description: z.string().optional(),
  blockDefinitions: z.array(blockDefinitionSchema).min(1, 'Добавьте хотя бы один блок'),
});

/** POST /api/report-templates — создать шаблон организации */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const body: unknown = await req.json();
    const parsed = createTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { name, description, blockDefinitions } = parsed.data;

    const template = await db.reportTemplate.create({
      data: {
        name,
        description: description ?? null,
        blockDefinitions: blockDefinitions as Prisma.InputJsonValue,
        isSystem: false,
        organizationId: orgId,
      },
      include: TEMPLATE_INCLUDE,
    });

    return successResponse(template);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания шаблона отчёта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
