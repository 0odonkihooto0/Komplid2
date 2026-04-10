import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const createMessageSchema = z.object({
  text: z.string().min(1, 'Введите текст сообщения').max(5000),
});

interface Params { params: { projectId: string; docId: string; wid: string } }

/** GET — список сообщений карточки ДО */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const workflow = await db.sEDWorkflow.findFirst({
      where: { id: params.wid, documentId: params.docId },
    });
    if (!workflow) return errorResponse('Карточка ДО не найдена', 404);

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      db.sEDWorkflowMessage.findMany({
        where: { workflowId: params.wid },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip,
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      db.sEDWorkflowMessage.count({ where: { workflowId: params.wid } }),
    ]);

    return successResponse(messages, { total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения сообщений ДО');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST — добавить сообщение в карточку ДО */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const workflow = await db.sEDWorkflow.findFirst({
      where: { id: params.wid, documentId: params.docId },
    });
    if (!workflow) return errorResponse('Карточка ДО не найдена', 404);

    const body = await req.json();
    const parsed = createMessageSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const message = await db.sEDWorkflowMessage.create({
      data: {
        text: parsed.data.text,
        workflowId: params.wid,
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(message);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания сообщения ДО');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
