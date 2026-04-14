import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import {
  updateExecutionDocStatusSchema,
  updateOverrideFieldsSchema,
  updateGeneralDocSchema,
} from '@/lib/validations/execution-doc';
import { successResponse, errorResponse } from '@/utils/api';
import { getDownloadUrl } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; docId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.executionDoc.findFirst({
      where: { id: params.docId, contractId: params.contractId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, middleName: true } },
        signatures: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        comments: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true } },
            resolvedBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        workRecord: {
          include: {
            workItem: {
              select: {
                name: true, projectCipher: true, normatives: true,
                ksiNode: { select: { code: true, name: true } },
              },
            },
            writeoffs: {
              include: {
                material: {
                  select: {
                    name: true,
                    documents: { select: { fileName: true }, take: 1 },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!doc) return errorResponse('Документ не найден', 404);

    // Добавить URL для скачивания PDF
    let downloadUrl: string | null = null;
    if (doc.s3Key) {
      downloadUrl = await getDownloadUrl(doc.s3Key);
    }

    // Вычислить предложенные поля для АОСР если overrideFields ещё не заданы
    let suggestedFields: Record<string, string> | null = null;
    if (doc.workRecord && !doc.overrideFields) {
      const wr = doc.workRecord;
      const date = wr.date ? new Date(wr.date) : null;
      const materials = wr.writeoffs.map((wo) => wo.material.name).filter(Boolean).join(', ');
      const firstDoc = wr.writeoffs.flatMap((wo) => wo.material.documents)[0];

      suggestedFields = {
        rabota: wr.workItem.name,
        ...(date ? {
          D1: String(date.getDate()),
          M1: String(date.getMonth() + 1),
          D2: String(date.getDate()),
          M2: String(date.getMonth() + 1),
        } : {}),
        ...(materials ? { material: materials } : {}),
        ...(firstDoc ? { cert: firstDoc.fileName } : {}),
        ...(wr.workItem.normatives ? { SNIP: wr.workItem.normatives } : {}),
        project: wr.workItem.projectCipher,
      };
    }

    return successResponse({ ...doc, downloadUrl, suggestedFields });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; docId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();

    const doc = await db.executionDoc.findFirst({
      where: { id: params.docId, contractId: params.contractId },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    // Режим хранения — запрет любого редактирования (ГОСТ Р 70108-2025)
    if (doc.storageMode) {
      return errorResponse('Документ в режиме хранения — редактирование запрещено', 403);
    }

    // Ветка 1: обновление overrideFields / overrideHtml (Фаза 3.6)
    if ('overrideFields' in body || 'overrideHtml' in body) {
      const parsed = updateOverrideFieldsSchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse('Ошибка валидации', 400, parsed.error.issues);
      }

      // Редактирование доступно только в статусах DRAFT и REJECTED
      if (doc.status !== 'DRAFT' && doc.status !== 'REJECTED') {
        return errorResponse(
          'Редактирование недоступно: документ находится в статусе ' + doc.status,
          400
        );
      }

      const updateData: Record<string, unknown> = {
        lastEditedAt: new Date(),
        lastEditedById: session.user.id,
      };

      if ('overrideFields' in parsed.data) {
        updateData.overrideFields = parsed.data.overrideFields !== undefined
          ? parsed.data.overrideFields as Prisma.InputJsonValue
          : Prisma.JsonNull;
      }
      if ('overrideHtml' in parsed.data) {
        updateData.overrideHtml = parsed.data.overrideHtml ?? null;
      }

      const updated = await db.executionDoc.update({
        where: { id: params.docId },
        data: updateData as Prisma.ExecutionDocUncheckedUpdateInput,
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      return successResponse(updated);
    }

    // Ветка 2: обновление статуса (существующая логика)
    const parsed = updateExecutionDocStatusSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Валидация переходов статуса
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['IN_REVIEW'],
      IN_REVIEW: ['SIGNED', 'REJECTED'],
      REJECTED: ['DRAFT'],
      SIGNED: [],
    };

    if (!validTransitions[doc.status]?.includes(parsed.data.status)) {
      return errorResponse(
        `Невозможно перевести документ из статуса "${doc.status}" в "${parsed.data.status}"`,
        400
      );
    }

    // Проверка ограничений ГПР при проведении (DRAFT → IN_REVIEW)
    if (doc.status === 'DRAFT' && parsed.data.status === 'IN_REVIEW' && doc.factVolume) {
      const ganttLinks = await db.ganttTaskExecDoc.findMany({
        where: { execDocId: params.docId },
        include: { ganttTask: { select: { id: true, volume: true } } },
      });

      for (const link of ganttLinks) {
        const task = link.ganttTask;
        if (!task.volume) continue;

        // Сумма factVolume всех других проведённых документов этой задачи
        const otherDocs = await db.executionDoc.aggregate({
          where: {
            ganttLinks: { some: { ganttTaskId: task.id } },
            id: { not: params.docId },
            status: { in: ['IN_REVIEW', 'SIGNED'] },
          },
          _sum: { factVolume: true },
        });

        const sumConducted = (otherDocs._sum.factVolume ?? 0) + doc.factVolume;
        if (sumConducted > task.volume) {
          return errorResponse(
            'Фактический объём превышает максимально допустимый по задаче ГПР',
            400
          );
        }
      }
    }

    const updated = await db.executionDoc.update({
      where: { id: params.docId },
      data: { status: parsed.data.status },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { signatures: true, comments: true } },
      },
    });

    // Ветка 3: поля свободной формы (GENERAL_DOCUMENT и аналогичные)
    const generalParsed = updateGeneralDocSchema.safeParse(body);
    if (generalParsed.success) {
      const { title, documentDate, note, attachmentS3Keys } = generalParsed.data;
      const generalData: Record<string, unknown> = {};
      if (title !== undefined) generalData.title = title;
      if (documentDate !== undefined) generalData.documentDate = documentDate ? new Date(documentDate) : null;
      if (note !== undefined) generalData.note = note;
      if (attachmentS3Keys !== undefined) generalData.attachmentS3Keys = attachmentS3Keys;
      if (Object.keys(generalData).length > 0) {
        await db.executionDoc.update({
          where: { id: params.docId },
          data: generalData as Prisma.ExecutionDocUpdateInput,
        });
      }
    }

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; docId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.executionDoc.findFirst({
      where: { id: params.docId, contractId: params.contractId },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    // Режим хранения — запрет удаления (ГОСТ Р 70108-2025)
    if (doc.storageMode) {
      return errorResponse('Документ в режиме хранения — удаление запрещено', 403);
    }

    if (doc.status !== 'DRAFT') {
      return errorResponse('Удалить можно только черновик', 400);
    }

    await db.executionDoc.delete({ where: { id: params.docId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
