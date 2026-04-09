import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { z } from 'zod';
export const dynamic = 'force-dynamic';

const createMessageSchema = z.object({
  text: z.string().min(1, 'Введите текст сообщения').max(10000),
  contractId: z.string().uuid().optional(),
  replyToId: z.string().uuid().optional(),
  attachmentType: z.enum(['ExecutionDoc', 'Defect', 'Material', 'Photo']).optional(),
  attachmentId: z.string().uuid().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { objectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const searchParams = req.nextUrl.searchParams;
    const contractId = searchParams.get('contractId');
    const before = searchParams.get('before'); // cursor: ISO-дата createdAt
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));

    const where: Record<string, unknown> = {
      projectId: params.objectId,
      ...(contractId ? { contractId } : {}),
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    };

    const messages = await db.chatMessage.findMany({
      where,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        replyTo: {
          select: {
            id: true,
            text: true,
            deletedAt: true,
            author: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    type MsgWithReply = {
      deletedAt: Date | null;
      text: string;
      replyTo: { deletedAt: Date | null; text: string } | null;
      [key: string]: unknown;
    };

    // Маскируем удалённые сообщения
    const result = (messages as MsgWithReply[]).map((msg) => ({
      ...msg,
      text: msg.deletedAt ? 'Сообщение удалено' : msg.text,
      replyTo: msg.replyTo
        ? {
            ...msg.replyTo,
            text: msg.replyTo.deletedAt ? 'Сообщение удалено' : msg.replyTo.text,
          }
        : null,
    }));

    // Определяем cursor для следующей страницы (cursor-based pagination)
    const nextCursor =
      messages.length === limit ? messages[messages.length - 1].createdAt.toISOString() : null;

    return successResponse({ data: result, nextCursor, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения истории чата');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST — fallback-эндпоинт для отправки сообщения если Socket.io недоступен */
export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createMessageSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { contractId, replyToId, attachmentType, attachmentId, ...rest } = parsed.data;

    // Проверяем, что replyToId принадлежит тому же проекту
    if (replyToId) {
      const replyMsg = await db.chatMessage.findFirst({
        where: { id: replyToId, projectId: params.objectId },
      });
      if (!replyMsg) return errorResponse('Сообщение для ответа не найдено', 404);
    }

    const message = await db.chatMessage.create({
      data: {
        ...rest,
        projectId: params.objectId,
        authorId: session.user.id,
        contractId: contractId ?? null,
        replyToId: replyToId ?? null,
        attachmentType: attachmentType ?? null,
        attachmentId: attachmentId ?? null,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        replyTo: {
          select: {
            id: true,
            text: true,
            author: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    return successResponse(message);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка отправки сообщения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
