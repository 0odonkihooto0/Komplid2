import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; contractId: string } };

const createRegistrySchema = z.object({
  name: z.string().min(1).default('Реестр исполнительной документации'),
});

/** GET — список реестров ИД по договору */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const registries = await db.idRegistry.findMany({
      where: { contractId: params.contractId },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(registries);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения реестров ИД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST — создать реестр ИД */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createRegistrySchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const registry = await db.idRegistry.create({
      data: {
        name: parsed.data.name,
        contractId: params.contractId,
      },
    });

    return successResponse(registry);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания реестра ИД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
