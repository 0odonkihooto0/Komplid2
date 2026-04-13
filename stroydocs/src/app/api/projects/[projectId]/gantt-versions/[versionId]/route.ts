import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateVersionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  stageId: z.string().uuid().optional().nullable(),
  contractId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
  isBaseline: z.boolean().optional(),
  isDirective: z.boolean().optional(),
  delegatedFromOrgId: z.string().uuid().optional().nullable(),
  delegatedToOrgId: z.string().uuid().optional().nullable(),
  accessOrgIds: z.array(z.string().uuid()).optional(),
  linkedVersionIds: z.array(z.string().uuid()).optional(),
  lockWorks: z.boolean().optional(),
  lockPlan: z.boolean().optional(),
  lockFact: z.boolean().optional(),
  calculationMethod: z.enum(['MANUAL', 'VOLUME', 'AMOUNT', 'MAN_HOURS', 'MACHINE_HOURS', 'LABOR']).optional(),
  disableVolumeRounding: z.boolean().optional(),
  allowOverplan: z.boolean().optional(),
  showSummaryRow: z.boolean().optional(),
});

async function getVersionOrError(
  versionId: string,
  projectId: string,
  organizationId: string
) {
  return db.ganttVersion.findFirst({
    where: {
      id: versionId,
      projectId,
      project: { organizationId },
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; versionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const version = await getVersionOrError(
      params.versionId,
      params.projectId,
      session.user.organizationId
    );
    if (!version) return errorResponse('Версия ГПР не найдена', 404);

    const body = await req.json();
    const parsed = updateVersionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Если меняется стадия — проверяем что она принадлежит этому объекту
    if (parsed.data.stageId) {
      const stage = await db.ganttStage.findFirst({
        where: { id: parsed.data.stageId, projectId: params.projectId },
      });
      if (!stage) return errorResponse('Стадия не найдена', 404);
    }

    const d = parsed.data;

    // При установке «Актуальная» — архивируем все другие активные версии проекта
    if (d.isActive === true) {
      await db.ganttVersion.updateMany({
        where: { projectId: params.projectId, id: { not: params.versionId }, isActive: true },
        data: { isActive: false, isBaseline: false },
      });
    }

    const updated = await db.ganttVersion.update({
      where: { id: params.versionId },
      data: {
        ...(d.name !== undefined && { name: d.name }),
        ...(d.description !== undefined && { description: d.description }),
        ...(d.stageId !== undefined && { stageId: d.stageId }),
        ...(d.contractId !== undefined && { contractId: d.contractId }),
        ...(d.isActive !== undefined && { isActive: d.isActive }),
        ...(d.isBaseline !== undefined && { isBaseline: d.isBaseline }),
        ...(d.isDirective !== undefined && { isDirective: d.isDirective }),
        ...(d.delegatedFromOrgId !== undefined && { delegatedFromOrgId: d.delegatedFromOrgId }),
        ...(d.delegatedToOrgId !== undefined && { delegatedToOrgId: d.delegatedToOrgId }),
        ...(d.accessOrgIds !== undefined && { accessOrgIds: d.accessOrgIds }),
        ...(d.linkedVersionIds !== undefined && { linkedVersionIds: d.linkedVersionIds }),
        ...(d.lockWorks !== undefined && { lockWorks: d.lockWorks }),
        ...(d.lockPlan !== undefined && { lockPlan: d.lockPlan }),
        ...(d.lockFact !== undefined && { lockFact: d.lockFact }),
        ...(d.calculationMethod !== undefined && { calculationMethod: d.calculationMethod }),
        ...(d.disableVolumeRounding !== undefined && { disableVolumeRounding: d.disableVolumeRounding }),
        ...(d.allowOverplan !== undefined && { allowOverplan: d.allowOverplan }),
        ...(d.showSummaryRow !== undefined && { showSummaryRow: d.showSummaryRow }),
      },
      include: {
        stage: { select: { id: true, name: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления версии ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; versionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const version = await getVersionOrError(
      params.versionId,
      params.projectId,
      session.user.organizationId
    );
    if (!version) return errorResponse('Версия ГПР не найдена', 404);

    // Нельзя удалять директивную версию
    if (version.isDirective) {
      return errorResponse('Нельзя удалить директивную версию ГПР', 409);
    }

    await db.ganttVersion.delete({ where: { id: params.versionId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления версии ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
