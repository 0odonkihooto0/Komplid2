import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const ENTITY_TYPES = ['DESIGN_TASK_PIR', 'DESIGN_TASK_SURVEY', 'DESIGN_DOC', 'PIR_CLOSURE'] as const;

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional(),
  entityType: z.enum(ENTITY_TYPES),
});

/**
 * GET /api/organizations/[orgId]/approval-templates
 * Список шаблонов маршрутов согласования организации.
 * Query: ?entityType=DESIGN_DOC — фильтр по типу сущности
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } },
) {
  try {
    const session = await getSessionOrThrow();
    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Нет доступа к этой организации', 403);
    }

    const entityType = req.nextUrl.searchParams.get('entityType') ?? undefined;

    const templates = await db.approvalTemplate.findMany({
      where: {
        organizationId: params.orgId,
        ...(entityType && { entityType }),
      },
      include: {
        levels: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { level: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(templates);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения шаблонов согласования');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/**
 * POST /api/organizations/[orgId]/approval-templates
 * Создать шаблон маршрута согласования.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { orgId: string } },
) {
  try {
    const session = await getSessionOrThrow();
    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Нет доступа к этой организации', 403);
    }

    const body = await req.json();
    const parsed = createTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { name, description, entityType } = parsed.data;

    const template = await db.approvalTemplate.create({
      data: {
        name,
        description: description ?? null,
        entityType,
        organizationId: params.orgId,
      },
      include: {
        levels: true,
      },
    });

    return successResponse(template);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания шаблона согласования');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
