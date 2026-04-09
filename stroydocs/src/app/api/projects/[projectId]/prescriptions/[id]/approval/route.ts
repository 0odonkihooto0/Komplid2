import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface Params { params: { projectId: string; id: string } }

// Порядок ролей в цепочке согласования (аналог execution-docs)
const ROLE_ORDER: Record<string, number> = {
  SUBCONTRACTOR: 0,
  CONTRACTOR: 1,
  DEVELOPER: 2,
  SUPERVISION: 3,
};

/** GET — получить маршрут согласования предписания */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const { id } = params;

    // Проверка принадлежности предписания к организации
    const prescription = await db.prescription.findFirst({
      where: { id, inspection: { buildingObject: { organizationId: session.user.organizationId } } },
      select: {
        approvalRouteId: true,
        approvalRoute: {
          include: {
            steps: {
              orderBy: { stepIndex: 'asc' },
              include: { user: { select: { id: true, firstName: true, lastName: true, position: true } } },
            },
          },
        },
      },
    });
    if (!prescription) return errorResponse('Предписание не найдено', 404);

    return successResponse(prescription.approvalRoute);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения маршрута согласования предписания');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST — запустить маршрут согласования предписания */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const { projectId, id } = params;

    // Проверка объекта и принадлежности
    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const prescription = await db.prescription.findFirst({
      where: { id, inspection: { projectId } },
      select: { id: true, approvalRouteId: true, inspection: { select: { projectId: true } } },
    });
    if (!prescription) return errorResponse('Предписание не найдено', 404);

    // Не запускать повторно если уже есть активный маршрут
    if (prescription.approvalRouteId) {
      const existing = await db.approvalRoute.findUnique({
        where: { id: prescription.approvalRouteId },
      });
      if (existing?.status === 'PENDING') {
        return errorResponse('Маршрут согласования уже запущен', 400);
      }
      // Удаляем старый маршрут для перезапуска
      await db.approvalRoute.delete({ where: { id: prescription.approvalRouteId } });
    }

    // Участники договоров объекта — формируют шаги согласования
    const participants = await db.contractParticipant.findMany({
      where: { contract: { projectId } },
      orderBy: { role: 'asc' },
    });

    // Убираем дублирующиеся роли, сортируем по порядку согласования
    const seenRoles = new Set<string>();
    const sortedParticipants = participants
      .filter((p) => {
        if (seenRoles.has(p.role)) return false;
        seenRoles.add(p.role);
        return true;
      })
      .sort((a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99));

    // Создаём новый маршрут и привязываем к предписанию за одну транзакцию
    const route = await db.$transaction(async (tx) => {
      const newRoute = await tx.approvalRoute.create({
        data: {
          status: 'PENDING',
          currentStepIdx: 0,
          steps: {
            create: sortedParticipants.map((p, idx) => ({
              stepIndex: idx,
              role: p.role,
              status: 'WAITING',
            })),
          },
        },
        include: {
          steps: {
            orderBy: { stepIndex: 'asc' },
            include: { user: { select: { id: true, firstName: true, lastName: true, position: true } } },
          },
        },
      });

      await tx.prescription.update({
        where: { id },
        data: { approvalRouteId: newRoute.id },
      });

      return newRoute;
    });

    return successResponse(route);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка запуска маршрута согласования предписания');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** DELETE — сбросить маршрут согласования предписания */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const { id } = params;

    const prescription = await db.prescription.findFirst({
      where: { id, inspection: { buildingObject: { organizationId: session.user.organizationId } } },
      select: { approvalRouteId: true },
    });
    if (!prescription) return errorResponse('Предписание не найдено', 404);
    if (!prescription.approvalRouteId) return errorResponse('Маршрут согласования не найден', 404);

    await db.approvalRoute.update({
      where: { id: prescription.approvalRouteId },
      data: { status: 'RESET' },
    });

    return successResponse({ message: 'Маршрут сброшен' });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка сброса маршрута согласования предписания');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
