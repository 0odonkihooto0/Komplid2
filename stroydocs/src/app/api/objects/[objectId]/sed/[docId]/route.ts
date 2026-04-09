import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { updateSEDSchema } from '@/lib/validations/sed';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { objectId: string; docId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.sEDDocument.findFirst({
      where: { id: params.docId, projectId: params.objectId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        senderOrg: { select: { id: true, name: true, inn: true } },
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

    if (!doc) return errorResponse('СЭД-документ не найден', 404);

    return successResponse(doc);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения СЭД-документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { objectId: string; docId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.sEDDocument.findFirst({
      where: { id: params.docId, projectId: params.objectId },
    });
    if (!doc) return errorResponse('СЭД-документ не найден', 404);

    const body = await req.json();
    const parsed = updateSEDSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    // Запрет редактирования содержимого для нечерновиков
    const contentFields = ['title', 'body', 'tags'] as const;
    const isNotDraft = doc.status !== 'DRAFT';
    if (isNotDraft && contentFields.some((f) => f in parsed.data)) {
      return errorResponse('Редактирование содержимого доступно только для черновиков', 409);
    }

    const updated = await db.sEDDocument.update({
      where: { id: params.docId },
      data: parsed.data,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        senderOrg: { select: { id: true, name: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления СЭД-документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
