import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AiCheckScope } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { requireFeature } from '@/lib/subscriptions/require-feature';
import { FEATURE_CODES } from '@/lib/features/codes';
import { enqueueComplianceCheck } from '@/lib/queue';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { PaymentRequiredError } from '@/lib/subscriptions/errors';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string } };

const createSchema = z.object({
  scope: z.nativeEnum(AiCheckScope),
  scopeFilter: z.record(z.string(), z.unknown()).optional(),
  closurePackageId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true, workspaceId: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    if (project.workspaceId) {
      await requireFeature(project.workspaceId, FEATURE_CODES.AI_COMPLIANCE_CHECK);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { scope, scopeFilter, closurePackageId } = parsed.data;

    // Считаем проверки за текущий месяц для limit-check
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const currentMonthCount = await db.aiComplianceCheck.count({
      where: {
        projectId: params.projectId,
        createdAt: { gte: monthStart },
      },
    });

    logger.info(
      { projectId: params.projectId, currentMonthCount, userId: session.user.id },
      '[compliance] Запуск AI-проверки',
    );

    const check = await db.aiComplianceCheck.create({
      data: {
        projectId: params.projectId,
        initiatedById: session.user.id,
        scope,
        scopeFilter: scopeFilter ? (scopeFilter as unknown as import('@prisma/client').Prisma.InputJsonValue) : undefined,
        closurePackageId: closurePackageId ?? null,
        status: 'QUEUED',
      },
    });

    await enqueueComplianceCheck(check.id);

    return successResponse({ checkId: check.id, estimatedMinutes: 3 });
  } catch (err) {
    if (err instanceof PaymentRequiredError) {
      return errorResponse('Функция недоступна на текущем тарифе', 402);
    }
    if (err instanceof Error && err.message === 'Unauthorized') return err as unknown as never;
    logger.error({ err }, '[compliance] Ошибка создания AI-проверки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const checks = await db.aiComplianceCheck.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        scope: true,
        status: true,
        summary: true,
        issueCount: true,
        checkedDocs: true,
        tokensUsed: true,
        startedAt: true,
        finishedAt: true,
        errorMessage: true,
        createdAt: true,
        closurePackageId: true,
        initiator: { select: { firstName: true, lastName: true } },
      },
    });

    return successResponse(checks);
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') return err as unknown as never;
    logger.error({ err }, '[compliance] Ошибка получения списка проверок');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
