import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { ParticipantRole } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/** POST — создать или перезапустить маршрут согласования для СЭД-документа */
export async function POST(
  _req: NextRequest,
  { params }: { params: { projectId: string; docId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.sEDDocument.findFirst({
      where: { id: params.docId, projectId: params.projectId },
    });
    if (!doc) return errorResponse('СЭД-документ не найден', 404);

    if (doc.status === 'APPROVED' || doc.status === 'ARCHIVED') {
      return errorResponse('Нельзя запустить согласование для утверждённого или архивного документа', 409);
    }

    // Если уже есть активный маршрут — удалить его
    if (doc.approvalRouteId) {
      await db.approvalRoute.delete({ where: { id: doc.approvalRouteId } });
    }

    // Получаем участников проекта через договоры для формирования шагов
    const participants = await db.contractParticipant.findMany({
      where: { contract: { projectId: params.projectId } },
      distinct: ['role'],
      orderBy: { role: 'asc' },
    });

    // Порядок ролей в цепочке согласования
    const roleOrder: Record<string, number> = {
      SUBCONTRACTOR: 0,
      CONTRACTOR: 1,
      DEVELOPER: 2,
      SUPERVISION: 3,
    };

    const uniqueRoles: ParticipantRole[] = Array.from(
      new Set(participants.map((p: { role: ParticipantRole }) => p.role))
    );
    const sortedRoles = uniqueRoles.sort(
      (a, b) => (roleOrder[a] ?? 99) - (roleOrder[b] ?? 99)
    );

    // Создаём маршрут (без FK на SEDDocument — связь через approvalRouteId на документе)
    const route = await db.approvalRoute.create({
      data: {
        documentType: 'SEDDocument',
        status: 'PENDING',
        currentStepIdx: 0,
        steps: {
          create: sortedRoles.map((role, idx) => ({
            stepIndex: idx,
            role,
            status: 'WAITING',
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

    // Привязываем маршрут к документу и переводим в IN_APPROVAL
    await db.sEDDocument.update({
      where: { id: params.docId },
      data: {
        approvalRouteId: route.id,
        status: 'IN_APPROVAL',
      },
    });

    return successResponse(route);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка запуска маршрута согласования СЭД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
