import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

interface Params { projectId: string }

const BRIEFING_INCLUDE = {
  conductedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

// GET /api/projects/[projectId]/safety-briefings — реестр инструктажей
export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId } = params;

    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const url = new URL(req.url);
    const type = url.searchParams.get('type') ?? undefined;

    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50')));
    const skip = (page - 1) * limit;

    const where = {
      projectId,
      ...(type ? { type: type as never } : {}),
    };

    const [briefings, total] = await Promise.all([
      db.safetyBriefing.findMany({
        where,
        include: BRIEFING_INCLUDE,
        orderBy: { date: 'desc' },
        take: limit,
        skip,
      }),
      db.safetyBriefing.count({ where }),
    ]);

    return successResponse({ data: briefings, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения инструктажей');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const createBriefingSchema = z.object({
  type: z.enum(['INTRODUCTORY', 'PRIMARY', 'TARGETED', 'REPEATED', 'UNSCHEDULED']),
  date: z.string().datetime('Укажите дату в формате ISO 8601'),
  topic: z.string().min(1, 'Введите тему инструктажа'),
  notes: z.string().optional(),
  participants: z.array(z.object({
    userId: z.string().optional(),
    fullName: z.string(),
    signed: z.boolean().default(false),
  })).optional(),
});

// POST /api/projects/[projectId]/safety-briefings — создать инструктаж
export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId } = params;

    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body: unknown = await req.json();
    const parsed = createBriefingSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { date, participants, ...rest } = parsed.data;

    const briefing = await db.safetyBriefing.create({
      data: {
        ...rest,
        date: new Date(date),
        projectId,
        conductedById: session.user.id,
        ...(participants ? { participants: participants as unknown as Prisma.InputJsonValue } : {}),
      },
      include: BRIEFING_INCLUDE,
    });

    return successResponse(briefing);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания инструктажа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
