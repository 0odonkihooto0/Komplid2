import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createDesignTaskSchema } from '@/lib/validations/design-task';
import { getNextDesignTaskNumber } from '@/lib/numbering';
import { DESIGN_PARAMS, SURVEY_PARAMS } from '../../../../../../prisma/seeds/design-task-params';
import type { DesignTaskStatus, DesignTaskType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { objectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const sp = req.nextUrl.searchParams;
    const taskType = sp.get('taskType') as DesignTaskType | null;
    const status = sp.get('status') as DesignTaskStatus | null;
    const page = Math.max(1, parseInt(sp.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(sp.get('limit') ?? '50')));
    const skip = (page - 1) * limit;

    const where = {
      projectId: params.objectId,
      ...(taskType && { taskType }),
      ...(status && { status }),
    };

    const [tasks, total] = await Promise.all([
      db.designTask.findMany({
        where,
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { comments: true, parameters: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.designTask.count({ where }),
    ]);

    return successResponse({ data: tasks, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения заданий ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createDesignTaskSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { taskType, docDate, approvedById, agreedById, customerOrgId, customerPersonId, s3Keys, notes } = parsed.data;

    // Авто-нумерация с advisory lock
    const number = await getNextDesignTaskNumber(params.objectId, taskType);

    // Инициализация параметров из справочника (95 для ЗП, 15 для ЗИ)
    const paramTemplates = taskType === 'DESIGN' ? DESIGN_PARAMS : SURVEY_PARAMS;

    const task = await db.designTask.create({
      data: {
        number,
        taskType,
        docDate: docDate ? new Date(docDate) : new Date(),
        approvedById: approvedById ?? null,
        agreedById: agreedById ?? null,
        customerOrgId: customerOrgId ?? null,
        customerPersonId: customerPersonId ?? null,
        s3Keys: s3Keys ?? [],
        notes: notes ?? null,
        projectId: params.objectId,
        authorId: session.user.id,
        parameters: {
          createMany: {
            data: paramTemplates.map((p) => ({
              paramKey: p.key,
              paramName: p.name,
              order: p.order,
              hasComment: false,
            })),
          },
        },
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { comments: true, parameters: true } },
      },
    });

    return successResponse(task);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания задания ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
