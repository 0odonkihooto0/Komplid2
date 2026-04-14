import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { orgId: string } };

/** Проверка: пользователь работает со своей организацией */
async function checkOrgAccess(orgId: string, sessionOrgId: string) {
  return orgId === sessionOrgId;
}

/** GET — список шаблонных категорий ИД организации (дерево) */
export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSessionOrThrow();

    if (!(await checkOrgAccess(params.orgId, session.user.organizationId))) {
      return errorResponse('Недостаточно прав', 403);
    }

    const templates = await db.idDocCategory.findMany({
      where: { organizationId: params.orgId, isTemplate: true, parentId: null },
      include: {
        children: {
          include: {
            children: {
              orderBy: { sortOrder: 'asc' },
            },
            _count: { select: { children: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return successResponse(templates);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения шаблонных категорий ИД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(200),
  parentId: z.string().uuid().optional(),
});

/** POST — создать шаблонную категорию ИД организации */
export async function POST(
  req: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSessionOrThrow();

    if (!(await checkOrgAccess(params.orgId, session.user.organizationId))) {
      return errorResponse('Недостаточно прав', 403);
    }

    const body = await req.json();
    const parsed = createTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { name, parentId } = parsed.data;

    // Если передан parentId — проверяем что родитель принадлежит той же организации
    if (parentId) {
      const parent = await db.idDocCategory.findFirst({
        where: { id: parentId, organizationId: params.orgId, isTemplate: true },
      });
      if (!parent) return errorResponse('Родительский шаблон не найден', 404);
    }

    // Определяем порядок — следующий среди сиблингов
    const siblingCount = await db.idDocCategory.count({
      where: { organizationId: params.orgId, isTemplate: true, parentId: parentId ?? null },
    });

    const template = await db.idDocCategory.create({
      data: {
        name,
        sortOrder: siblingCount,
        parentId: parentId ?? null,
        organizationId: params.orgId,
        isTemplate: true,
      },
    });

    return successResponse(template);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания шаблонной категории ИД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
