import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { addSEDLinkSchema } from '@/lib/validations/sed';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; docId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.sEDDocument.findFirst({
      where: { id: params.docId, projectId: params.projectId },
      select: { id: true },
    });
    if (!doc) return errorResponse('СЭД-документ не найден', 404);

    const links = await db.sEDLink.findMany({
      where: { documentId: params.docId },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(links);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения связей СЭД-документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

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

    const doc = await db.sEDDocument.findFirst({
      where: { id: params.docId, projectId: params.projectId },
      select: { id: true },
    });
    if (!doc) return errorResponse('СЭД-документ не найден', 404);

    const body = await req.json();
    const parsed = addSEDLinkSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    try {
      const link = await db.sEDLink.create({
        data: {
          documentId: params.docId,
          entityType: parsed.data.entityType,
          entityId: parsed.data.entityId,
        },
      });
      return successResponse(link);
    } catch (err: unknown) {
      // Уникальное ограничение — связь уже существует
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        return errorResponse('Такая связь уже существует', 409);
      }
      throw err;
    }
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания связи СЭД-документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
