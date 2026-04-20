import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import type { AosrRegistryRow } from '@/types/aosr-registry';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  field: z.string().min(1),
  value: z.string(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; docId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Неверные данные', 400);

    const { field, value } = parsed.data;

    const doc = await db.executionDoc.findFirst({
      where: { id: params.docId, contractId: params.contractId },
    });
    if (!doc) return errorResponse('Документ не найден', 404);
    if (doc.status === 'SIGNED') return errorResponse('Нельзя редактировать подписанный документ', 403);

    const existingOverrides = (doc.overrideFields as Record<string, string>) ?? {};

    // Если value пустая — удаляем ключ (сброс к DB-значению)
    const updatedOverrides = { ...existingOverrides };
    if (value === '') {
      delete updatedOverrides[field];
    } else {
      updatedOverrides[field] = value;
    }

    const updated = await db.executionDoc.update({
      where: { id: params.docId },
      data: {
        overrideFields: updatedOverrides,
        lastEditedAt: new Date(),
        lastEditedById: session.user.id,
      },
      include: {
        workRecord: {
          include: {
            workItem: true,
            writeoffs: {
              include: {
                material: {
                  include: { documents: { take: 1, orderBy: { uploadedAt: 'asc' } } },
                },
              },
            },
          },
        },
      },
    });

    const overrides = (updated.overrideFields as Record<string, string>) ?? {};
    const dbMaterials = updated.workRecord
      ? updated.workRecord.writeoffs.map((w) => w.material.name).join(', ')
      : '';
    const dbCertificates = updated.workRecord
      ? updated.workRecord.writeoffs
          .flatMap((w) => w.material.documents)
          .map((d) => d.fileName)
          .join(', ')
      : '';

    const row: AosrRegistryRow = {
      id: updated.id,
      number: updated.number,
      status: updated.status,
      workName: updated.workRecord?.workItem?.name ?? '',
      materials: overrides.materials ?? dbMaterials,
      certificates: overrides.certificates ?? dbCertificates,
      schemaRef: overrides.schemaRef ?? '',
      nextWorks: overrides.nextWorks ?? '',
      dbMaterials,
      dbCertificates,
      overrides,
    };

    return successResponse(row);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления строки реестра АОСР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
