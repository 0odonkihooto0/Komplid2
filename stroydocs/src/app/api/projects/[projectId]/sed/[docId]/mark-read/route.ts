import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { markReadSchema } from '@/lib/validations/sed';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; docId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = markReadSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { documentIds, isRead } = parsed.data;

    // Visibility filter — обновляем только те документы к которым у пользователя есть доступ
    const visibilityWhere = {
      OR: [
        { authorId: session.user.id },
        { senderOrgId: session.user.organizationId },
        { receiverOrgIds: { has: session.user.organizationId } },
        { receiverOrgId: session.user.organizationId },
        { observers: { has: session.user.id } },
        {
          workflows: {
            some: {
              OR: [
                { initiatorId: session.user.id },
                { participants: { has: session.user.id } },
                { observers: { has: session.user.id } },
              ],
            },
          },
        },
      ],
    };

    const result = await db.sEDDocument.updateMany({
      where: {
        id: { in: documentIds },
        projectId: params.projectId,
        ...visibilityWhere,
      },
      data: {
        isRead,
        readAt: isRead ? new Date() : null,
      },
    });

    return successResponse({ updated: result.count });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка массовой отметки прочитанным СЭД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
