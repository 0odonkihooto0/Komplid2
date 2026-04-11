import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const createStampSchema = z.object({
  entityType: z.string().min(1, 'Тип сущности обязателен'),
  entityId: z.string().min(1, 'ID сущности обязателен'),
  stampText: z.string().min(1, 'Текст штампа обязателен'),
  s3Key: z.string().min(1, 'Ключ S3-файла обязателен'),
  positionX: z.number(),
  positionY: z.number(),
  page: z.number().int().min(0),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  titleId: z.string().optional(),
});

type Params = { params: { projectId: string } };

/**
 * GET /api/projects/[projectId]/stamps
 * Список штампов для конкретной сущности.
 * Query: ?entityType=DESIGN_DOC&entityId=xxx (обязательны оба параметра)
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const sp = req.nextUrl.searchParams;
    const entityType = sp.get('entityType');
    const entityId = sp.get('entityId');

    if (!entityType || !entityId) {
      return errorResponse('Параметры entityType и entityId обязательны', 400);
    }

    const stamps = await db.pdfStamp.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(stamps);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения штампов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/**
 * POST /api/projects/[projectId]/stamps
 * Создать штамп на PDF-документе.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createStampSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { entityType, entityId, stampText, s3Key, positionX, positionY, page, width, height, titleId } =
      parsed.data;

    const stamp = await db.pdfStamp.create({
      data: {
        entityType,
        entityId,
        stampText,
        s3Key,
        positionX,
        positionY,
        page,
        width: width ?? 200,
        height: height ?? 100,
        titleId: titleId ?? null,
      },
    });

    return successResponse(stamp);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания штампа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
