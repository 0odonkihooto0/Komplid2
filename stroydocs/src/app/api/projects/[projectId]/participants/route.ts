import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/**
 * GET — сводный список участников по всем договорам объекта строительства.
 * Агрегирует ContractParticipant по organizationId, возвращает уникальные организации
 * с их ролями и списком договоров, к которым они привязаны.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const allParticipants = await db.contractParticipant.findMany({
      where: { contract: { projectId: params.projectId } },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            inn: true,
            sroNumber: true,
            sroName: true,
          },
        },
        contract: {
          select: { id: true, number: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Группируем по organizationId: одна карточка на организацию со всеми её ролями и договорами
    const byOrg = new Map<
      string,
      {
        organization: (typeof allParticipants)[0]['organization'];
        roles: Set<string>;
        contracts: Array<{ id: string; number: string; name: string | null }>;
      }
    >();

    for (const p of allParticipants) {
      const existing = byOrg.get(p.organizationId);
      if (existing) {
        existing.roles.add(p.role);
        // Добавляем договор если ещё не добавлен
        if (!existing.contracts.some((c) => c.id === p.contract.id)) {
          existing.contracts.push(p.contract);
        }
      } else {
        byOrg.set(p.organizationId, {
          organization: p.organization,
          roles: new Set([p.role]),
          contracts: [p.contract],
        });
      }
    }

    const result = Array.from(byOrg.values()).map((entry) => ({
      organization: entry.organization,
      roles: Array.from(entry.roles),
      contracts: entry.contracts,
    }));

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения участников проекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
