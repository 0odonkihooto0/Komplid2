import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { addParticipantSchema } from '@/lib/validations/contract';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { objectId: string; contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const participants = await db.contractParticipant.findMany({
      where: { contractId: params.contractId },
      include: {
        organization: { select: { id: true, name: true, inn: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(participants);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = addParticipantSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { appointmentDate, ...rest } = parsed.data;

    // Проверяем существование организации перед добавлением участника
    const organization = await db.organization.findUnique({ where: { id: rest.organizationId } });
    if (!organization) return errorResponse('Организация не найдена', 404);

    const participant = await db.contractParticipant.create({
      data: {
        ...rest,
        appointmentDate: appointmentDate ? new Date(appointmentDate) : null,
        contractId: params.contractId,
      },
      include: {
        organization: { select: { id: true, name: true, inn: true } },
      },
    });

    return successResponse(participant);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    // Нарушение уникального ограничения: такой участник с этой ролью уже добавлен
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return errorResponse('Участник с такой ролью уже добавлен в этот договор', 409);
    }
    logger.error({ err: error }, 'Ошибка добавления участника');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
