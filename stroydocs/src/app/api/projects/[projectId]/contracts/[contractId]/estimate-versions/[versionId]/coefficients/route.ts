import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { createCoefficientSchema } from '@/lib/validations/estimate-additional-cost';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; contractId: string; versionId: string } };

/** Проверяем цепочку: проект → контракт → версия */
async function resolveVersion(projectId: string, contractId: string, versionId: string, orgId: string) {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId: orgId },
  });
  if (!project) return null;

  const version = await db.estimateVersion.findFirst({
    where: { id: versionId, contractId },
  });
  return version;
}

/** GET — коэффициенты пересчёта версии сметы */
export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSessionOrThrow();
    const version = await resolveVersion(
      params.projectId, params.contractId, params.versionId, session.user.organizationId
    );
    if (!version) return errorResponse('Версия сметы не найдена', 404);

    const coefficients = await db.estimateCoefficient.findMany({
      where: { versionId: params.versionId },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(coefficients);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения коэффициентов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST — создать коэффициент пересчёта */
export async function POST(
  req: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSessionOrThrow();
    const version = await resolveVersion(
      params.projectId, params.contractId, params.versionId, session.user.organizationId
    );
    if (!version) return errorResponse('Версия сметы не найдена', 404);

    const body = await req.json();
    const parsed = createCoefficientSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const data = parsed.data;

    const coefficient = await db.estimateCoefficient.create({
      data: {
        name: data.name,
        code: data.code ?? null,
        application: data.application,
        value: data.value,
        versionId: params.versionId,
      },
    });

    return successResponse(coefficient);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания коэффициента');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
