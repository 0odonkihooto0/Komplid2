import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { createModelSchema } from '@/lib/validations/bim';
import { BimModelStatus, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/** GET /api/projects/[projectId]/bim/models — список ТИМ-моделей */
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get('sectionId') ?? undefined;
    const status = searchParams.get('status') as BimModelStatus | null;
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get('limit') ?? DEFAULT_LIMIT)));
    const skip = (page - 1) * limit;

    const where = {
      projectId: params.projectId,
      ...(sectionId ? { sectionId } : {}),
      ...(status ? { status } : {}),
    };

    const [models, total] = await Promise.all([
      db.bimModel.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          section: { select: { id: true, name: true } },
          uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      db.bimModel.count({ where }),
    ]);

    return successResponse(models, { page, pageSize: limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM models GET failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}

/** POST /api/projects/[projectId]/bim/models — создать запись модели после загрузки в S3 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = createModelSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { name, comment, sectionId, stage, s3Key, fileName, fileSize, metadata } = parsed.data;

    // Проверить что раздел принадлежит этому проекту
    const section = await db.bimSection.findFirst({
      where: { id: sectionId, projectId: params.projectId },
    });
    if (!section) return errorResponse('Раздел не найден', 404);

    const model = await db.bimModel.create({
      data: {
        name,
        comment: comment ?? null,
        status: BimModelStatus.PROCESSING,
        stage: stage ?? null,
        sectionId,
        projectId: params.projectId,
        uploadedById: session.user.id,
        s3Key,
        fileName,
        fileSize: fileSize ?? null,
        isCurrent: true,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });

    // Добавить в очередь парсинга IFC (Шаг 4 — worker ещё не реализован, заглушка)
    try {
      const { getParseBimQueue } = await import('@/lib/queues/parse-bim');
      await getParseBimQueue().add('parse-ifc', { modelId: model.id, s3Key });
    } catch {
      // Очередь недоступна (Шаг 4 не реализован) — статус останется PROCESSING
      logger.warn({ modelId: model.id }, 'BIM parse queue not available, model stays PROCESSING');
    }

    return successResponse(model);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM models POST failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
