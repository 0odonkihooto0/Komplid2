import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const linkExecDocSchema = z.object({
  executionDocId: z.string().min(1),
});

type Params = { params: { projectId: string; docId: string } };

// POST — привязать исполнительный документ (АОСР) к документу ПИР
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const doc = await db.designDocument.findFirst({
      where: {
        id: params.docId,
        projectId: params.projectId,
        isDeleted: false,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true, linkedExecDocIds: true },
    });
    if (!doc) return errorResponse('Документ ПИР не найден', 404);

    const body = await req.json();
    const parsed = linkExecDocSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { executionDocId } = parsed.data;

    // Проверить, что исполнительный документ существует в том же проекте
    const execDoc = await db.executionDoc.findFirst({
      where: {
        id: executionDocId,
        contract: { projectId: params.projectId },
      },
      select: { id: true },
    });
    if (!execDoc) return errorResponse('Исполнительный документ не найден в данном проекте', 404);

    // Защита от дублирования
    if (doc.linkedExecDocIds.includes(executionDocId)) {
      return errorResponse('Исполнительный документ уже привязан', 409);
    }

    const updated = await db.designDocument.update({
      where: { id: params.docId },
      data: { linkedExecDocIds: { push: executionDocId } },
      select: { id: true, linkedExecDocIds: true },
    });

    return successResponse({ linkedExecDocIds: updated.linkedExecDocIds });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка привязки АОСР к документу ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
