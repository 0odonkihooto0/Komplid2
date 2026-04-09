import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { updateCorrespondenceSchema } from '@/lib/validations/correspondence';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; corrId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const correspondence = await db.correspondence.findFirst({
      where: { id: params.corrId, projectId: params.projectId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        senderOrg: { select: { id: true, name: true, inn: true } },
        receiverOrg: { select: { id: true, name: true, inn: true } },
        attachments: true,
        approvalRoute: {
          include: {
            steps: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
              orderBy: { stepIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!correspondence) return errorResponse('Письмо не найдено', 404);

    return successResponse(correspondence);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения письма');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; corrId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const correspondence = await db.correspondence.findFirst({
      where: { id: params.corrId, projectId: params.projectId },
    });
    if (!correspondence) return errorResponse('Письмо не найдено', 404);

    const body = await req.json();
    const parsed = updateCorrespondenceSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    // Запрет редактирования содержимого для нечерновиков
    const contentFields = ['subject', 'body', 'tags'] as const;
    const isNotDraft = correspondence.status !== 'DRAFT';
    if (isNotDraft && contentFields.some((f) => f in parsed.data)) {
      return errorResponse(
        'Редактирование содержимого доступно только для черновиков',
        409
      );
    }

    const updated = await db.correspondence.update({
      where: { id: params.corrId },
      data: parsed.data,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        senderOrg: { select: { id: true, name: true } },
        receiverOrg: { select: { id: true, name: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления письма');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; corrId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const correspondence = await db.correspondence.findFirst({
      where: { id: params.corrId, projectId: params.projectId },
    });
    if (!correspondence) return errorResponse('Письмо не найдено', 404);

    // Удаление разрешено только для черновиков
    if (correspondence.status !== 'DRAFT') {
      return errorResponse('Удалить можно только черновик', 409);
    }

    await db.correspondence.delete({ where: { id: params.corrId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления письма');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
