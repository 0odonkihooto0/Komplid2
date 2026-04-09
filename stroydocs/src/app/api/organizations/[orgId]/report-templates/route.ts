import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { ReportBlockType } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface Params { orgId: string }

// Тип определения блока для шаблона
const blockDefinitionSchema = z.object({
  order: z.number().int().min(0),
  type: z.nativeEnum(ReportBlockType),
  title: z.string().min(1),
});

/** GET /api/organizations/[orgId]/report-templates — список шаблонов */
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { orgId: requestedOrgId } = params;

    // Организация должна совпадать с организацией пользователя
    if (requestedOrgId !== orgId) {
      return errorResponse('Недостаточно прав', 403);
    }

    // Шаблоны: системные + принадлежащие организации
    const templates = await db.reportTemplate.findMany({
      where: {
        OR: [{ isSystem: true }, { organizationId: orgId }],
      },
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
    });

    return successResponse(templates);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения шаблонов отчётов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Введите название шаблона'),
  description: z.string().optional(),
  blockDefinitions: z.array(blockDefinitionSchema).min(1, 'Добавьте хотя бы один блок'),
});

/** POST /api/organizations/[orgId]/report-templates — создать шаблон */
export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { orgId: requestedOrgId } = params;

    if (requestedOrgId !== orgId) {
      return errorResponse('Недостаточно прав', 403);
    }

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
        blockDefinitions,
        isSystem: false,
        organizationId: orgId,
      },
    });

    return successResponse(template);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания шаблона отчётов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
