import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { invalidateAnalyticsCache } from '@/lib/analytics/cache';

export const dynamic = 'force-dynamic';

interface Params { projectId: string; id: string }

const addRemediationSchema = z.object({
  number: z.string().min(1, 'Введите номер акта устранения'),
  prescriptionId: z.string().min(1, 'Укажите предписание'),
  defectIds: z.array(z.string()).min(1, 'Укажите хотя бы один недостаток'),
  remediationDetails: z.record(z.string(), z.unknown()).optional(),
});

// POST /api/projects/[projectId]/inspections/[id]/add-remediation — добавить акт устранения
export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId, id } = params;

    // Проверяем доступ к объекту
    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверяем что проверка существует
    const inspection = await db.inspection.findFirst({
      where: { id, projectId, buildingObject: { organizationId: orgId } },
      select: { id: true },
    });
    if (!inspection) return errorResponse('Проверка не найдена', 404);

    const body: unknown = await req.json();
    const parsed = addRemediationSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { prescriptionId, defectIds, remediationDetails, ...rest } = parsed.data;

    // Проверяем что предписание принадлежит этой проверке
    const prescription = await db.prescription.findFirst({
      where: { id: prescriptionId, inspectionId: id },
      select: { id: true },
    });
    if (!prescription) {
      return errorResponse('Предписание не найдено в данной проверке', 404);
    }

    // Создаём акт устранения и обновляем статус дефектов
    const remediationAct = await db.$transaction(async (tx) => {
      const act = await tx.defectRemediationAct.create({
        data: {
          ...rest,
          inspectionId: id,
          prescriptionId,
          defectIds,
          issuedById: session.user.id,
          status: 'DRAFT',
          ...(remediationDetails ? { remediationDetails: remediationDetails as Prisma.InputJsonValue } : {}),
        },
        include: {
          issuedBy: { select: { id: true, firstName: true, lastName: true } },
          prescription: { select: { id: true, number: true, type: true } },
        },
      });

      // Переводим дефекты в статус IN_PROGRESS
      await tx.defect.updateMany({
        where: { id: { in: defectIds } },
        data: { status: 'IN_PROGRESS' },
      });

      return act;
    });

    await invalidateAnalyticsCache(projectId, orgId);

    return successResponse(remediationAct);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка добавления акта устранения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
