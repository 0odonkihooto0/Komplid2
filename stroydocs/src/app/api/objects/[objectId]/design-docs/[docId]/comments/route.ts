import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { getNextDocCommentNumber } from '@/lib/numbering';
import type { DesignCommentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const createDocCommentSchema = z.object({
  text: z.string().min(1),
  commentType: z.string().optional(),
  urgency: z.string().optional(),
  deadline: z.string().datetime().optional(),
  requiresAttention: z.boolean().default(false),
  assigneeId: z.string().optional(),
  s3Keys: z.array(z.string()).default([]),
});

type Params = { params: { objectId: string; docId: string } };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const doc = await db.designDocument.findFirst({
      where: {
        id: params.docId,
        projectId: params.objectId,
        isDeleted: false,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    const sp = req.nextUrl.searchParams;
    const status = sp.get('status') as DesignCommentStatus | null;
    const page = Math.max(1, parseInt(sp.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(sp.get('limit') ?? '50')));
    const skip = (page - 1) * limit;

    const where = {
      docId: params.docId,
      ...(status && { status }),
    };

    const [comments, total] = await Promise.all([
      db.designDocComment.findMany({
        where,
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { number: 'asc' },
        take: limit,
        skip,
      }),
      db.designDocComment.count({ where }),
    ]);

    return successResponse({ data: comments, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения замечаний к документу ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const doc = await db.designDocument.findFirst({
      where: {
        id: params.docId,
        projectId: params.objectId,
        isDeleted: false,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    const body = await req.json();
    const parsed = createDocCommentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { text, commentType, urgency, deadline, requiresAttention, assigneeId, s3Keys } = parsed.data;

    const number = await getNextDocCommentNumber(params.docId);

    const comment = await db.designDocComment.create({
      data: {
        number,
        text,
        commentType: commentType ?? null,
        urgency: urgency ?? null,
        deadline: deadline ? new Date(deadline) : null,
        requiresAttention,
        assigneeId: assigneeId ?? null,
        s3Keys: s3Keys ?? [],
        docId: params.docId,
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Уведомить назначенного исполнителя
    if (assigneeId) {
      await db.notification.create({
        data: {
          userId: assigneeId,
          type: 'comment_assigned',
          title: 'Новое замечание к документу ПИР',
          body: `Замечание №${number}: ${text.slice(0, 100)}`,
          entityType: 'DesignDocument',
          entityId: params.docId,
        },
      }).catch((err: unknown) => logger.error({ err }, 'Ошибка уведомления о замечании к документу ПИР'));
    }

    return successResponse(comment);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания замечания к документу ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
