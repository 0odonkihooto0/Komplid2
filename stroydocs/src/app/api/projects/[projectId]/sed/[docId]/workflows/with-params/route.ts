import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const withParamsSchema = z.object({
  type: z.string().optional(),
  incomingNumber: z.string().optional(),
  receiverOrgId: z.string().uuid('Неверный формат receiverOrgId'),
  receiverUserId: z.string().uuid().optional(),
});

interface Params { params: { projectId: string; docId: string } }

/**
 * POST — обновить параметры документа перед созданием ДО.
 * Возвращает documentId; сам ДО создаётся отдельным запросом к POST /workflows.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.sEDDocument.findFirst({
      where: { id: params.docId, projectId: params.projectId },
    });
    if (!doc) return errorResponse('СЭД-документ не найден', 404);

    const body = await req.json();
    const parsed = withParamsSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { incomingNumber, receiverOrgId, receiverUserId } = parsed.data;

    await db.sEDDocument.update({
      where: { id: params.docId },
      data: {
        ...(incomingNumber !== undefined ? { incomingNumber } : {}),
        receiverOrgId,
        ...(receiverUserId !== undefined ? { receiverUserId } : {}),
      },
    });

    return successResponse({ documentId: params.docId });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления параметров документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
