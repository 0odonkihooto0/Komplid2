import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const ENTITY_TYPES = ['DESIGN_TASK_PIR', 'DESIGN_TASK_SURVEY', 'DESIGN_DOC', 'PIR_CLOSURE'] as const;
type EntityType = (typeof ENTITY_TYPES)[number];

const applySchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().min(1, 'ID сущности обязателен'),
});

type Params = { params: { orgId: string; tid: string } };

/**
 * Найти сущность по типу и ID с проверкой принадлежности к организации.
 * Возвращает текущий approvalRouteId или null если сущность не найдена.
 */
async function findEntity(
  orgId: string,
  entityType: EntityType,
  entityId: string,
): Promise<{ approvalRouteId: string | null } | null> {
  switch (entityType) {
    case 'DESIGN_DOC': {
      const doc = await db.designDocument.findFirst({
        where: { id: entityId, isDeleted: false, buildingObject: { organizationId: orgId } },
        select: { id: true, approvalRouteId: true },
      });
      return doc ? { approvalRouteId: doc.approvalRouteId } : null;
    }
    case 'DESIGN_TASK_PIR': {
      // taskType='DESIGN' — задание на проектирование (ЗП)
      const task = await db.designTask.findFirst({
        where: { id: entityId, taskType: 'DESIGN', buildingObject: { organizationId: orgId } },
        select: { id: true, approvalRouteId: true },
      });
      return task ? { approvalRouteId: task.approvalRouteId } : null;
    }
    case 'DESIGN_TASK_SURVEY': {
      // taskType='SURVEY' — задание на инженерные изыскания (ЗИ)
      const task = await db.designTask.findFirst({
        where: { id: entityId, taskType: 'SURVEY', buildingObject: { organizationId: orgId } },
        select: { id: true, approvalRouteId: true },
      });
      return task ? { approvalRouteId: task.approvalRouteId } : null;
    }
    case 'PIR_CLOSURE': {
      const act = await db.pIRClosureAct.findFirst({
        where: { id: entityId, buildingObject: { organizationId: orgId } },
        select: { id: true, approvalRouteId: true },
      });
      return act ? { approvalRouteId: act.approvalRouteId } : null;
    }
  }
}

/** Привязать созданный маршрут к сущности и перевести в статус IN_APPROVAL */
async function attachRouteToEntity(
  entityType: EntityType,
  entityId: string,
  routeId: string,
): Promise<void> {
  switch (entityType) {
    case 'DESIGN_DOC':
      await db.designDocument.update({
        where: { id: entityId },
        data: { approvalRouteId: routeId, status: 'IN_APPROVAL' },
      });
      break;
    case 'DESIGN_TASK_PIR':
    case 'DESIGN_TASK_SURVEY':
      await db.designTask.update({
        where: { id: entityId },
        data: { approvalRouteId: routeId, status: 'IN_APPROVAL' },
      });
      break;
    case 'PIR_CLOSURE':
      await db.pIRClosureAct.update({
        where: { id: entityId },
        data: { approvalRouteId: routeId, status: 'IN_APPROVAL' },
      });
      break;
  }
}

/**
 * POST /api/organizations/[orgId]/approval-templates/[tid]/apply
 * Применить шаблон согласования к сущности — создать ApprovalRoute + ApprovalStep.
 * Body: { entityType, entityId }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Нет доступа к этой организации', 403);
    }

    const template = await db.approvalTemplate.findFirst({
      where: { id: params.tid, organizationId: params.orgId },
      include: { levels: { orderBy: { level: 'asc' } } },
    });
    if (!template) return errorResponse('Шаблон не найден', 404);

    if (template.levels.length === 0) {
      return errorResponse('Шаблон не содержит уровней согласования', 400);
    }

    const body = await req.json();
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { entityType, entityId } = parsed.data;

    // Проверить совместимость типа сущности с шаблоном
    if (entityType !== template.entityType) {
      return errorResponse(
        `Шаблон предназначен для типа "${template.entityType}", запрошен "${entityType}"`,
        400,
      );
    }

    const entity = await findEntity(params.orgId, entityType, entityId);
    if (!entity) return errorResponse('Сущность не найдена', 404);

    if (entity.approvalRouteId) {
      return errorResponse('Маршрут согласования уже существует для этой сущности', 409);
    }

    // Создать маршрут и шаги в транзакции, затем привязать к сущности
    const route = await db.$transaction(async (tx) => {
      const newRoute = await tx.approvalRoute.create({
        data: {
          status: 'PENDING',
          currentStepIdx: 0,
          documentType: entityType,
          steps: {
            create: template.levels.map((lvl) => ({
              stepIndex: lvl.level,
              // Роль участника — дефолт CONTRACTOR для шаблонных шагов
              // (в шаблоне нет поля role, используется контекстный дефолт)
              role: 'CONTRACTOR' as const,
              status: 'WAITING' as const,
              userId: lvl.userId,
            })),
          },
        },
        include: {
          steps: {
            orderBy: { stepIndex: 'asc' },
            include: {
              user: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      });

      await attachRouteToEntity(entityType, entityId, newRoute.id);

      return newRoute;
    });

    return successResponse(route);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка применения шаблона согласования');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
