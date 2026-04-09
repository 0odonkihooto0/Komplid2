import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Формат даты: YYYY-MM-DD'),
  weather: z.string().max(50).optional(),
  temperature: z.number().int().min(-60).max(60).optional(),
  workersCount: z.number().int().min(0).optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { objectId: string; contractId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const logs = await db.dailyLog.findMany({
      where: { contractId: params.contractId },
      orderBy: { date: 'desc' },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(logs);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения ежедневных журналов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const contract = await db.contract.findFirst({
      where: { id: params.contractId, projectId: params.objectId },
    });
    if (!contract) return errorResponse('Договор не найден', 404);

    const body: unknown = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { date, ...rest } = parsed.data;

    // Upsert: один журнал в день на договор
    const log = await db.dailyLog.upsert({
      where: {
        contractId_date: {
          contractId: params.contractId,
          date: new Date(date),
        },
      },
      create: {
        date: new Date(date),
        ...rest,
        contractId: params.contractId,
        authorId: session.user.id,
      },
      update: {
        ...rest,
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(log);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания ежедневного журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
