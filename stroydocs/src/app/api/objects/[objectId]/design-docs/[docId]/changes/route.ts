import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const createChangeSchema = z.object({
  description: z.string().min(1, 'Описание обязательно').max(1000),
});

type Params = { params: { objectId: string; docId: string } };

// Проверяем принадлежность документа организации
async function getDocOrThrow(docId: string, objectId: string, organizationId: string) {
  const doc = await db.designDocument.findFirst({
    where: {
      id: docId,
      projectId: objectId,
      buildingObject: { organizationId },
    },
    select: { id: true, version: true },
  });
  return doc;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const doc = await getDocOrThrow(params.docId, params.objectId, session.user.organizationId);
    if (!doc) return errorResponse('Документ не найден', 404);

    const changes = await db.designDocChange.findMany({
      where: { docId: params.docId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(changes);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения журнала изменений документа ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const doc = await getDocOrThrow(params.docId, params.objectId, session.user.organizationId);
    if (!doc) return errorResponse('Документ не найден', 404);

    const body = await req.json();
    const parsed = createChangeSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const change = await db.designDocChange.create({
      data: {
        docId: params.docId,
        changeDescription: parsed.data.description,
        version: doc.version,
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(change);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка добавления записи изменения документа ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
