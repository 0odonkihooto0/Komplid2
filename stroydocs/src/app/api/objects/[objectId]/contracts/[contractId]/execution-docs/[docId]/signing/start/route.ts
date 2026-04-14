import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; contractId: string; docId: string } };

const bodySchema = z
  .object({
    signerIds: z.array(z.string().uuid()).min(1).optional(),
    templateId: z.string().optional(),
  })
  .refine((d) => d.signerIds || d.templateId, {
    message: 'Укажите список подписантов или выберите шаблон',
  });

// Маппинг роли участника договора → роль пользователя в системе
const PARTICIPANT_ROLE_TO_USER_ROLE: Record<string, string[]> = {
  SUBCONTRACTOR: ['WORKER', 'MANAGER'],
  CONTRACTOR: ['ADMIN', 'MANAGER'],
  DEVELOPER: ['CUSTOMER'],
  SUPERVISION: ['CONTROLLER'],
};

/** POST — запустить маршрут подписания */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.executionDoc.findFirst({
      where: { id: params.docId, contractId: params.contractId },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Проверить, нет ли уже активного маршрута
    const existing = await db.signingRoute.findUnique({
      where: { executionDocId: params.docId },
    });
    if (existing && existing.status === 'PENDING') {
      return errorResponse('Маршрут подписания уже запущен', 400);
    }

    let signerIds: string[] = [];

    if (parsed.data.signerIds) {
      // Прямой выбор подписантов
      signerIds = parsed.data.signerIds;
    } else if (parsed.data.templateId) {
      // Разрешить шаблон в список подписантов через участников договора
      const participants = await db.contractParticipant.findMany({
        where: { contractId: params.contractId },
        orderBy: { role: 'asc' },
      });

      const roleOrder: Record<string, number> = {
        SUBCONTRACTOR: 0,
        CONTRACTOR: 1,
        DEVELOPER: 2,
        SUPERVISION: 3,
      };

      const sortedParticipants = participants.sort(
        (a, b) => (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99)
      );

      // Фильтрация по шаблону
      const filteredRoles =
        parsed.data.templateId === 'contractor-developer'
          ? ['CONTRACTOR', 'DEVELOPER']
          : parsed.data.templateId === 'developer-only'
            ? ['DEVELOPER']
            : sortedParticipants.map((p) => p.role); // contract-participants — все

      const uniqueRoles = Array.from(new Set(filteredRoles));

      for (const role of uniqueRoles) {
        const userRoles = PARTICIPANT_ROLE_TO_USER_ROLE[role] ?? [];
        const user = await db.user.findFirst({
          where: {
            organizationId: session.user.organizationId,
            role: { in: userRoles as ('ADMIN' | 'MANAGER' | 'WORKER' | 'CONTROLLER' | 'CUSTOMER')[] },
            isActive: true,
          },
          select: { id: true },
        });
        if (user) signerIds.push(user.id);
      }
    }

    if (signerIds.length === 0) {
      return errorResponse('Не удалось определить подписантов. Проверьте участников договора.', 400);
    }

    // Если предыдущий маршрут существует — удалить
    if (existing) {
      await db.signingRoute.delete({ where: { id: existing.id } });
    }

    const route = await db.signingRoute.create({
      data: {
        executionDocId: params.docId,
        status: 'PENDING',
        steps: {
          create: signerIds.map((uid, idx) => ({
            stepIndex: idx,
            userId: uid,
            status: 'WAITING',
          })),
        },
      },
      include: {
        steps: {
          orderBy: { stepIndex: 'asc' },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, position: true },
            },
          },
        },
      },
    });

    return successResponse(route);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка запуска маршрута подписания');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
