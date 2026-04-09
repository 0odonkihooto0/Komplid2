import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { answerRFISchema } from '@/lib/validations/rfi';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string; rfiId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const rfi = await db.rFI.findFirst({
      where: { id: params.rfiId, projectId: params.objectId },
    });
    if (!rfi) return errorResponse('RFI не найден', 404);

    if (rfi.status === 'ANSWERED' || rfi.status === 'CLOSED') {
      return errorResponse('RFI уже закрыт или имеет ответ', 409);
    }

    const body = await req.json();
    const parsed = answerRFISchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const updated = await db.rFI.update({
      where: { id: params.rfiId },
      data: {
        response: parsed.data.response,
        status: 'ANSWERED',
        answeredAt: new Date(),
        answeredById: session.user.id,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        answeredBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Уведомляем автора RFI о получении ответа
    await db.notification.create({
      data: {
        userId: rfi.authorId,
        type: 'RFI_ANSWERED',
        title: 'Получен ответ на вопрос RFI',
        body: `${rfi.number}: ${rfi.title}`,
        entityType: 'RFI',
        entityId: rfi.id,
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка ответа на RFI');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
