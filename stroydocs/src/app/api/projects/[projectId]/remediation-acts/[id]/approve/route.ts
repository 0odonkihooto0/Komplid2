import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { invalidateAnalyticsCache } from '@/lib/analytics/cache';

export const dynamic = 'force-dynamic';

interface Params { projectId: string; id: string }

const approveSchema = z.object({
  decision: z.enum(['ACCEPTED', 'REJECTED']),
  comment: z.string().optional(),
});

// POST /api/projects/[projectId]/remediation-acts/[id]/approve — согласовать акт устранения
export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId, id } = params;

    const existing = await db.defectRemediationAct.findFirst({
      where: { id, inspection: { projectId, buildingObject: { organizationId: orgId } } },
      select: { id: true, status: true, defectIds: true, prescriptionId: true },
    });
    if (!existing) return errorResponse('Акт устранения не найден', 404);

    const body: unknown = await req.json();
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { decision, comment } = parsed.data;
    const now = new Date();

    const result = await db.$transaction(async (tx) => {
      // Обновляем статус акта
      const updated = await tx.defectRemediationAct.update({
        where: { id },
        data: { status: decision },
      });

      if (decision === 'ACCEPTED') {
        // Все дефекты из акта → RESOLVED
        await tx.defect.updateMany({
          where: { id: { in: existing.defectIds } },
          data: { status: 'RESOLVED', resolvedAt: now },
        });

        // Проверяем, все ли дефекты предписания устранены
        const openDefects = await tx.defect.count({
          where: {
            prescriptionId: existing.prescriptionId,
            status: { notIn: ['RESOLVED', 'CONFIRMED'] },
          },
        });

        // Если все дефекты устранены — закрываем предписание
        if (openDefects === 0) {
          await tx.prescription.update({
            where: { id: existing.prescriptionId },
            data: { status: 'CLOSED', closedAt: now },
          });
        }
      } else {
        // REJECTED: возвращаем дефекты в работу
        await tx.defect.updateMany({
          where: { id: { in: existing.defectIds } },
          data: { status: 'IN_PROGRESS', resolvedAt: null },
        });
      }

      // Уведомляем автора акта о решении
      await tx.notification.create({
        data: {
          type: 'remediation_reviewed',
          title: decision === 'ACCEPTED' ? 'Акт устранения принят' : 'Акт устранения отклонён',
          body: comment ?? `Акт устранения №${updated.number} ${decision === 'ACCEPTED' ? 'принят' : 'отклонён'}`,
          userId: updated.issuedById,
          entityType: 'DefectRemediationAct',
          entityId: id,
          entityName: `Акт устранения №${updated.number}`,
        },
      });

      return updated;
    });

    await invalidateAnalyticsCache(projectId, orgId);

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка согласования акта устранения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
