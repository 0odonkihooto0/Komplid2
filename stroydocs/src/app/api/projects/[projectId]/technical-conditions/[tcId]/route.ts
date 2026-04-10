import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { updateTechnicalConditionSchema } from '@/lib/validations/technical-condition';

export const dynamic = 'force-dynamic';

async function verifyObjectAccess(projectId: string, organizationId: string) {
  return db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
}

// GET — получение одного технического условия с земельным участком и организацией
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; tcId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const object = await verifyObjectAccess(params.projectId, session.user.organizationId);
    if (!object) return errorResponse('Объект не найден', 404);

    const condition = await db.technicalCondition.findFirst({
      where: { id: params.tcId, projectId: params.projectId },
      include: {
        landPlot: { select: { id: true, cadastralNumber: true } },
        responsibleOrg: { select: { id: true, name: true } },
      },
    });

    if (!condition) return errorResponse('Техническое условие не найдено', 404);

    return successResponse(condition);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения технического условия');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// PUT — обновление технического условия
export async function PUT(
  req: NextRequest,
  { params }: { params: { projectId: string; tcId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const object = await verifyObjectAccess(params.projectId, session.user.organizationId);
    if (!object) return errorResponse('Объект не найден', 404);

    // Проверяем что ТУ принадлежит этому проекту
    const existing = await db.technicalCondition.findFirst({
      where: { id: params.tcId, projectId: params.projectId },
      select: { id: true },
    });
    if (!existing) return errorResponse('Техническое условие не найдено', 404);

    const body = await req.json();
    const parsed = updateTechnicalConditionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { issueDate, expirationDate, ...rest } = parsed.data;

    // Формируем объект обновления с конвертацией дат только при наличии новых значений
    const updateData: Record<string, unknown> = { ...rest };
    if (issueDate !== undefined) {
      updateData.issueDate = issueDate ? new Date(issueDate) : null;
    }
    if (expirationDate !== undefined) {
      updateData.expirationDate = expirationDate ? new Date(expirationDate) : null;
    }

    const condition = await db.technicalCondition.update({
      where: { id: params.tcId },
      data: updateData,
      include: {
        landPlot: { select: { id: true, cadastralNumber: true } },
        responsibleOrg: { select: { id: true, name: true } },
      },
    });

    return successResponse(condition);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления технического условия');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// DELETE — удаление технического условия
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; tcId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const object = await verifyObjectAccess(params.projectId, session.user.organizationId);
    if (!object) return errorResponse('Объект не найден', 404);

    // Проверяем принадлежность ТУ к проекту перед удалением
    const existing = await db.technicalCondition.findFirst({
      where: { id: params.tcId, projectId: params.projectId },
      select: { id: true },
    });
    if (!existing) return errorResponse('Техническое условие не найдено', 404);

    await db.technicalCondition.delete({ where: { id: params.tcId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления технического условия');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
