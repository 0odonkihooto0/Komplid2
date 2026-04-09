import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { createWorkItemSchema } from '@/lib/validations/work-item';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { objectId: string; contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const workItems = await db.workItem.findMany({
      where: { contractId: params.contractId },
      include: {
        ksiNode: { select: { id: true, code: true, name: true } },
        _count: { select: { workRecords: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(workItems);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения видов работ');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createWorkItemSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const workItem = await db.workItem.create({
      data: {
        ...parsed.data,
        contractId: params.contractId,
      },
      include: {
        ksiNode: { select: { id: true, code: true, name: true } },
      },
    });

    return successResponse(workItem);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания вида работ');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
