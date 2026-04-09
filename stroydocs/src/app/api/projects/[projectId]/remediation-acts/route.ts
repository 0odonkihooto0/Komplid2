import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { invalidateAnalyticsCache } from '@/lib/analytics/cache';

export const dynamic = 'force-dynamic';

interface Params { projectId: string }

const REMEDIATION_ACT_INCLUDE = {
  issuedBy: { select: { id: true, firstName: true, lastName: true } },
  prescription: { select: { id: true, number: true, type: true } },
  inspection: { select: { id: true, number: true } },
} as const;

// GET /api/projects/[projectId]/remediation-acts — реестр актов устранения
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
    const status = url.searchParams.get('status') ?? undefined;

    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50')));
    const skip = (page - 1) * limit;

    const where = {
      inspection: { projectId },
      ...(status ? { status: status as never } : {}),
    };

    const [acts, total] = await Promise.all([
      db.defectRemediationAct.findMany({
        where,
        include: REMEDIATION_ACT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.defectRemediationAct.count({ where }),
    ]);

    return successResponse({ data: acts, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения актов устранения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const createRemediationActSchema = z.object({
  number: z.string().min(1, 'Введите номер акта'),
  inspectionId: z.string().min(1, 'Укажите проверку'),
  prescriptionId: z.string().min(1, 'Укажите предписание'),
  defectIds: z.array(z.string()).min(1, 'Укажите хотя бы один недостаток'),
  remediationDetails: z.record(z.string(), z.unknown()).optional(),
});

// POST /api/projects/[projectId]/remediation-acts — создать акт устранения
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
    const parsed = createRemediationActSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { inspectionId, prescriptionId, defectIds, remediationDetails, ...rest } = parsed.data;

    // Проверяем что проверка и предписание принадлежат объекту
    const prescription = await db.prescription.findFirst({
      where: { id: prescriptionId, inspectionId, inspection: { projectId } },
      select: { id: true },
    });
    if (!prescription) {
      return errorResponse('Предписание не найдено в данном проекте', 404);
    }

    // Создаём акт и обновляем статусы дефектов в транзакции
    const act = await db.$transaction(async (tx) => {
      const created = await tx.defectRemediationAct.create({
        data: {
          ...rest,
          inspectionId,
          prescriptionId,
          defectIds,
          issuedById: session.user.id,
          ...(remediationDetails ? { remediationDetails: remediationDetails as Prisma.InputJsonValue } : {}),
        },
        include: REMEDIATION_ACT_INCLUDE,
      });

      // Переводим указанные дефекты в статус «На рассмотрении»
      await tx.defect.updateMany({
        where: { id: { in: defectIds } },
        data: { status: 'IN_PROGRESS' },
      });

      return created;
    });

    await invalidateAnalyticsCache(projectId, orgId);

    return successResponse(act);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания акта устранения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
