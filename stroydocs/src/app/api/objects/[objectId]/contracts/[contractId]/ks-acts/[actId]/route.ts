import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; contractId: string; actId: string } };

const participantSchema = z.object({
  role: z.string(),
  orgName: z.string(),
  inn: z.string().optional(),
  representative: z.string().optional(),
  position: z.string().optional(),
  order: z.string().optional(),
});

const indicatorSchema = z.object({
  name: z.string(),
  unit: z.string().optional(),
  designValue: z.string().optional(),
  actualValue: z.string().optional(),
});

const workItemSchema = z.object({
  name: z.string(),
  unit: z.string().optional(),
  volume: z.string().optional(),
  note: z.string().optional(),
});

const commissionMemberSchema = z.object({
  name: z.string(),
  position: z.string().optional(),
  role: z.string().optional(),
  orgName: z.string().optional(),
});

const updateKsActSchema = z.object({
  designOrg: z.string().optional().nullable(),
  designOrgInn: z.string().optional().nullable(),
  objectDesc: z.string().optional().nullable(),
  totalArea: z.number().optional().nullable(),
  buildingVolume: z.number().optional().nullable(),
  floorCount: z.number().int().optional().nullable(),
  constructionClass: z.string().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  deviations: z.string().optional().nullable(),
  constructionCost: z.number().optional().nullable(),
  actualCost: z.number().optional().nullable(),
  documents: z.string().optional().nullable(),
  conclusion: z.string().optional().nullable(),
  participants: z.array(participantSchema).optional(),
  indicators: z.array(indicatorSchema).optional(),
  workList: z.array(workItemSchema).optional(),
  commissionMembers: z.array(commissionMemberSchema).optional(),
  // Поля ExecutionDoc
  title: z.string().optional(),
  documentDate: z.string().datetime().optional().nullable(),
  note: z.string().optional().nullable(),
});

/** GET — деталь акта КС-11/КС-14 с данными формы */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const doc = await db.executionDoc.findFirst({
      where: {
        id: params.actId,
        contractId: params.contractId,
        type: { in: ['KS_11', 'KS_14'] },
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        ksActFormData: true,
        contract: {
          select: {
            number: true,
            buildingObject: { select: { name: true, address: true } },
            participants: {
              include: { organization: { select: { id: true, name: true, inn: true } } },
            },
          },
        },
        approvalRoute: {
          select: { id: true, status: true, currentStepIdx: true },
        },
        _count: { select: { signatures: true, comments: true } },
      },
    });
    if (!doc) return errorResponse('Акт не найден', 404);

    return successResponse(doc);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения акта КС-11/КС-14');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** PATCH — обновить данные формы КС-11/КС-14 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const doc = await db.executionDoc.findFirst({
      where: {
        id: params.actId,
        contractId: params.contractId,
        type: { in: ['KS_11', 'KS_14'] },
      },
    });
    if (!doc) return errorResponse('Акт не найден', 404);
    if (doc.storageMode) return errorResponse('Документ переведён в режим хранения', 403);

    const body = await req.json();
    const parsed = updateKsActSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const {
      title, documentDate, note,
      participants, indicators, workList, commissionMembers,
      startDate, endDate,
      ...formFields
    } = parsed.data;

    // Обновляем KsActFormData через upsert (nested write — FK выставляется Prisma автоматически)
    const formDataFields = {
      ...formFields,
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(participants !== undefined && { participants: participants as Prisma.InputJsonValue }),
      ...(indicators !== undefined && { indicators: indicators as Prisma.InputJsonValue }),
      ...(workList !== undefined && { workList: workList as Prisma.InputJsonValue }),
      ...(commissionMembers !== undefined && { commissionMembers: commissionMembers as Prisma.InputJsonValue }),
    };

    const updatedDoc = await db.executionDoc.update({
      where: { id: params.actId },
      data: {
        ...(title !== undefined && { title }),
        ...(documentDate !== undefined && { documentDate: documentDate ? new Date(documentDate) : null }),
        ...(note !== undefined && { note }),
        ksActFormData: {
          upsert: {
            create: formDataFields,
            update: formDataFields,
          },
        },
      },
      include: {
        ksActFormData: true,
        _count: { select: { signatures: true, comments: true } },
      },
    });

    return successResponse(updatedDoc);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления акта КС-11/КС-14');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
