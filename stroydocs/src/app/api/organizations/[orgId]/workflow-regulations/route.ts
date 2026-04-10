import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { ParticipantRole } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const stepSchema = z.object({
  role: z.nativeEnum(ParticipantRole),
  userId: z.string().uuid().optional(),
});

const createRegulationSchema = z.object({
  name: z.string().min(1, 'Введите название регламента').max(200),
  description: z.string().max(1000).optional(),
  stepsTemplate: z.array(stepSchema).min(1, 'Регламент должен содержать хотя бы один шаг'),
});

interface Params { params: { orgId: string } }

/** GET — список регламентов организации */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем что запрос к своей организации
    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Недостаточно прав', 403);
    }

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const skip = (page - 1) * limit;

    const [regulations, total] = await Promise.all([
      db.workflowRegulation.findMany({
        where: { organizationId: params.orgId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.workflowRegulation.count({ where: { organizationId: params.orgId } }),
    ]);

    return successResponse(regulations, { total, page, pageSize: limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения регламентов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST — создать регламент (только ADMIN) */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    if (session.user.organizationId !== params.orgId) {
      return errorResponse('Недостаточно прав', 403);
    }
    if (session.user.role !== 'ADMIN') {
      return errorResponse('Только администратор может создавать регламенты', 403);
    }

    const body = await req.json();
    const parsed = createRegulationSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const regulation = await db.workflowRegulation.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        stepsTemplate: parsed.data.stepsTemplate,
        organizationId: params.orgId,
      },
    });

    return successResponse(regulation);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания регламента');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
