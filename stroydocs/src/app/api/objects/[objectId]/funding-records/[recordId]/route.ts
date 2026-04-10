import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  year: z.number().int().min(2000).max(2100).optional(),
  recordType: z.enum(['ALLOCATED', 'DELIVERED']).optional(),
  federalBudget: z.number().min(0).optional(),
  regionalBudget: z.number().min(0).optional(),
  localBudget: z.number().min(0).optional(),
  ownFunds: z.number().min(0).optional(),
  extraBudget: z.number().min(0).optional(),
});

async function verifyAccess(objectId: string, recordId: string, organizationId: string) {
  const object = await db.buildingObject.findFirst({
    where: { id: objectId, organizationId },
    select: { id: true },
  });
  if (!object) return { error: 'Объект не найден' };

  const record = await db.fundingRecord.findFirst({
    where: { id: recordId, projectId: objectId },
  });
  if (!record) return { error: 'Запись финансирования не найдена' };

  return { record };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { objectId: string; recordId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const { record, error } = await verifyAccess(
      params.objectId,
      params.recordId,
      session.user.organizationId
    );
    if (error || !record) return errorResponse(error ?? 'Не найдено', 404);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Пересчитываем totalAmount с учётом обновлённых значений
    const merged = {
      federalBudget: parsed.data.federalBudget ?? record.federalBudget,
      regionalBudget: parsed.data.regionalBudget ?? record.regionalBudget,
      localBudget: parsed.data.localBudget ?? record.localBudget,
      ownFunds: parsed.data.ownFunds ?? record.ownFunds,
      extraBudget: parsed.data.extraBudget ?? record.extraBudget,
    };
    const totalAmount =
      merged.federalBudget +
      merged.regionalBudget +
      merged.localBudget +
      merged.ownFunds +
      merged.extraBudget;

    const updated = await db.fundingRecord.update({
      where: { id: params.recordId },
      data: { ...parsed.data, totalAmount },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления записи финансирования');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { objectId: string; recordId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const { error } = await verifyAccess(
      params.objectId,
      params.recordId,
      session.user.organizationId
    );
    if (error) return errorResponse(error, 404);

    await db.fundingRecord.delete({ where: { id: params.recordId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления записи финансирования');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
