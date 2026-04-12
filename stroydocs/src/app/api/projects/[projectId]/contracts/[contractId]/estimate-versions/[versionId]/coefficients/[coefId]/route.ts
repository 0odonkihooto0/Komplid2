import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { patchCoefficientSchema } from '@/lib/validations/estimate-additional-cost';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; contractId: string; versionId: string; coefId: string } };

/** Проверяем цепочку: проект → версия → коэффициент */
async function resolveCoefficient(
  projectId: string, contractId: string, versionId: string, coefId: string, orgId: string
) {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId: orgId },
  });
  if (!project) return null;

  const version = await db.estimateVersion.findFirst({
    where: { id: versionId, contractId },
  });
  if (!version) return null;

  const coefficient = await db.estimateCoefficient.findFirst({
    where: { id: coefId, versionId },
  });
  return coefficient;
}

/** PATCH — обновить коэффициент (включая isEnabled для отключения) */
export async function PATCH(
  req: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSessionOrThrow();
    const coefficient = await resolveCoefficient(
      params.projectId, params.contractId, params.versionId, params.coefId, session.user.organizationId
    );
    if (!coefficient) return errorResponse('Коэффициент не найден', 404);

    const body = await req.json();
    const parsed = patchCoefficientSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const data = parsed.data;

    const updated = await db.estimateCoefficient.update({
      where: { id: params.coefId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.code !== undefined && { code: data.code }),
        ...(data.application !== undefined && { application: data.application }),
        ...(data.value !== undefined && { value: data.value }),
        ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления коэффициента');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** DELETE — удалить коэффициент */
export async function DELETE(
  _req: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSessionOrThrow();
    const coefficient = await resolveCoefficient(
      params.projectId, params.contractId, params.versionId, params.coefId, session.user.organizationId
    );
    if (!coefficient) return errorResponse('Коэффициент не найден', 404);

    await db.estimateCoefficient.delete({ where: { id: params.coefId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления коэффициента');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
