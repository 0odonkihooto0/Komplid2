import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const fundingSchema = z.object({
  type: z.enum(['BUDGET', 'EXTRA_BUDGET', 'CREDIT', 'OWN']),
  name: z.string().min(1).max(200),
  amount: z.number().positive(),
  period: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
});

async function getProjectOrFail(projectId: string, organizationId: string) {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
  return project;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { objectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await getProjectOrFail(params.objectId, session.user.organizationId);
    if (!project) return errorResponse('Проект не найден', 404);

    const sources = await db.fundingSource.findMany({
      where: { projectId: params.objectId },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(sources);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения источников финансирования');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await getProjectOrFail(params.objectId, session.user.organizationId);
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = fundingSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const source = await db.fundingSource.create({
      data: { ...parsed.data, projectId: params.objectId },
    });

    return successResponse(source);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания источника финансирования');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
