import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  year: z.number().int().min(2000).max(2100).optional(),
  federalBudget: z.number().min(0).optional(),
  regionalBudget: z.number().min(0).optional(),
  localBudget: z.number().min(0).optional(),
  ownFunds: z.number().min(0).optional(),
  extraBudget: z.number().min(0).optional(),
  riskReason: z.string().min(1).optional(),
  resolutionProposal: z.string().optional().nullable(),
  completionDate: z.string().optional().nullable(),
  contractId: z.string().optional().nullable(),
});

async function verifyAccess(projectId: string, riskId: string, organizationId: string) {
  const object = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
  if (!object) return { error: 'Объект не найден' };

  const risk = await db.limitRisk.findFirst({
    where: { id: riskId, projectId },
  });
  if (!risk) return { error: 'Риск не найден' };

  return { risk };
}

// PATCH — обновление риска неосвоения лимитов
export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; id: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const { risk, error } = await verifyAccess(params.projectId, params.id, session.user.organizationId);
    if (error || !risk) return errorResponse(error ?? 'Не найдено', 404);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Пересчитываем totalAmount с учётом обновлённых значений
    const merged = {
      federalBudget: parsed.data.federalBudget ?? risk.federalBudget,
      regionalBudget: parsed.data.regionalBudget ?? risk.regionalBudget,
      localBudget: parsed.data.localBudget ?? risk.localBudget,
      ownFunds: parsed.data.ownFunds ?? risk.ownFunds,
      extraBudget: parsed.data.extraBudget ?? risk.extraBudget,
    };
    const totalAmount =
      merged.federalBudget +
      merged.regionalBudget +
      merged.localBudget +
      merged.ownFunds +
      merged.extraBudget;

    const { completionDate, ...restData } = parsed.data;

    const updated = await db.limitRisk.update({
      where: { id: params.id },
      data: {
        ...restData,
        totalAmount,
        completionDate: completionDate !== undefined
          ? (completionDate ? new Date(completionDate) : null)
          : undefined,
      },
      include: {
        contract: { select: { id: true, number: true, name: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления риска неосвоения лимитов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// DELETE — удаление риска неосвоения лимитов
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; id: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const { error } = await verifyAccess(params.projectId, params.id, session.user.organizationId);
    if (error) return errorResponse(error, 404);

    await db.limitRisk.delete({ where: { id: params.id } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления риска неосвоения лимитов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
