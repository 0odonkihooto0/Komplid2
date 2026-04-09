import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateDocCommentSchema = z.object({
  response: z.string().min(1).optional(),
  action: z.enum(['accept', 'reopen']).optional(),
  deadline: z.string().datetime().nullable().optional(),
  s3Keys: z.array(z.string()).optional(),
  status: z.enum(['ACTIVE', 'ANSWERED', 'CLOSED']).optional(),
  requiresAttention: z.boolean().optional(),
});

type Params = { params: { projectId: string; docId: string; commentId: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const doc = await db.designDocument.findFirst({
      where: {
        id: params.docId,
        projectId: params.projectId,
        isDeleted: false,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    const comment = await db.designDocComment.findFirst({
      where: { id: params.commentId, docId: params.docId },
    });
    if (!comment) return errorResponse('Замечание не найдено', 404);

    const body = await req.json();
    const parsed = updateDocCommentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { response, action, deadline, s3Keys, status, requiresAttention } = parsed.data;

    let updateData: Record<string, unknown> = {};

    if (response) {
      updateData = {
        response,
        respondedAt: new Date(),
        respondedById: session.user.id,
        status: 'ANSWERED',
      };
    } else if (action === 'accept') {
      updateData = { status: 'CLOSED' };
    } else if (action === 'reopen') {
      updateData = {
        status: 'ACTIVE',
        response: null,
        respondedAt: null,
        respondedById: null,
      };
    } else {
      if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;
      if (s3Keys !== undefined) updateData.s3Keys = s3Keys;
      if (status !== undefined) updateData.status = status;
      if (requiresAttention !== undefined) updateData.requiresAttention = requiresAttention;
    }

    const updated = await db.designDocComment.update({
      where: { id: params.commentId },
      data: updateData,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        respondedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления замечания к документу ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
