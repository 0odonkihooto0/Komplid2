import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { updateRFISchema } from '@/lib/validations/rfi';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; rfiId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const rfi = await db.rFI.findFirst({
      where: { id: params.rfiId, projectId: params.projectId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        answeredBy: { select: { id: true, firstName: true, lastName: true } },
        attachments: true,
      },
    });

    if (!rfi) return errorResponse('RFI не найден', 404);

    return successResponse(rfi);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения RFI');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; rfiId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const rfi = await db.rFI.findFirst({
      where: { id: params.rfiId, projectId: params.projectId },
    });
    if (!rfi) return errorResponse('RFI не найден', 404);

    const body = await req.json();
    const parsed = updateRFISchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { deadline, assigneeId, ...rest } = parsed.data;

    const updated = await db.rFI.update({
      where: { id: params.rfiId },
      data: {
        ...rest,
        ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
        ...(assigneeId !== undefined ? { assigneeId } : {}),
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления RFI');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
