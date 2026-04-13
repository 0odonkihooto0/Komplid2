import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// Возвращает организации, участвующие в проекте (через договора) + собственную организацию
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Организации участников договоров проекта
    const participants = await db.contractParticipant.findMany({
      where: { contract: { projectId: params.projectId } },
      select: {
        role: true,
        organization: { select: { id: true, name: true, inn: true } },
      },
      distinct: ['organizationId'],
    });

    // Собственная организация пользователя
    const ownOrg = await db.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { id: true, name: true, inn: true },
    });

    const orgMap = new Map<string, { id: string; name: string; inn: string }>();
    if (ownOrg) orgMap.set(ownOrg.id, ownOrg);
    participants.forEach(({ organization }) => {
      orgMap.set(organization.id, organization);
    });

    return successResponse(Array.from(orgMap.values()));
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения организаций ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
