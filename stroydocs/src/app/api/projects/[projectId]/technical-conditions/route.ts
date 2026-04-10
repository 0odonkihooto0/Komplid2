import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createTechnicalConditionSchema } from '@/lib/validations/technical-condition';

export const dynamic = 'force-dynamic';

async function verifyObjectAccess(projectId: string, organizationId: string) {
  return db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
}

// GET — список технических условий проекта с земельным участком и ответственной организацией
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const object = await verifyObjectAccess(params.projectId, session.user.organizationId);
    if (!object) return errorResponse('Объект не найден', 404);

    const conditions = await db.technicalCondition.findMany({
      where: { projectId: params.projectId },
      include: {
        landPlot: { select: { id: true, cadastralNumber: true } },
        responsibleOrg: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(conditions);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения технических условий');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// POST — создание технического условия
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const object = await verifyObjectAccess(params.projectId, session.user.organizationId);
    if (!object) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = createTechnicalConditionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { issueDate, expirationDate, ...rest } = parsed.data;

    const condition = await db.technicalCondition.create({
      data: {
        ...rest,
        projectId: params.projectId,
        // Конвертация строковых дат в объекты Date
        issueDate: issueDate ? new Date(issueDate) : null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
      },
      include: {
        landPlot: { select: { id: true, cadastralNumber: true } },
        responsibleOrg: { select: { id: true, name: true } },
      },
    });

    return successResponse(condition);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания технического условия');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
