import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string } };

const createSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  number: z.string().min(1).optional(),
  notes: z.string().optional(),
  executionDocIds: z.array(z.string().uuid()).default([]),
  registryIds: z.array(z.string().uuid()).default([]),
  archiveDocIds: z.array(z.string().uuid()).default([]),
});

/** GET — список закрывающих пакетов объекта */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10)));
    const skip = (page - 1) * limit;

    const [packages, total] = await Promise.all([
      db.idClosurePackage.findMany({
        where: { projectId: params.objectId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          createdBy: {
            select: { firstName: true, lastName: true, middleName: true },
          },
        },
      }),
      db.idClosurePackage.count({ where: { projectId: params.objectId } }),
    ]);

    return successResponse(packages, { total, page, pageSize: limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения закрывающих пакетов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST — создать закрывающий пакет */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { name, number, notes, executionDocIds, registryIds, archiveDocIds } = parsed.data;

    // Авто-нумерация если номер не указан
    const packageNumber = number ?? `ЗП-${Date.now().toString(36).toUpperCase()}`;

    const pkg = await db.idClosurePackage.create({
      data: {
        name,
        number: packageNumber,
        notes,
        executionDocIds,
        registryIds,
        archiveDocIds,
        projectId: params.objectId,
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, middleName: true },
        },
      },
    });

    return successResponse(pkg);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания закрывающего пакета');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
