import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { updatePIRRegistrySchema, registryActionSchema } from '@/lib/validations/pir-registry';

export const dynamic = 'force-dynamic';

const REGISTRY_INCLUDE = {
  author: { select: { id: true, firstName: true, lastName: true } },
  senderOrg: { select: { id: true, name: true } },
  receiverOrg: { select: { id: true, name: true } },
  senderPerson: { select: { id: true, firstName: true, lastName: true } },
  receiverPerson: { select: { id: true, firstName: true, lastName: true } },
  items: {
    include: {
      doc: { select: { id: true, number: true, name: true, docType: true, status: true, version: true } },
    },
    orderBy: { order: 'asc' as const },
  },
} as const;

type Params = { params: { projectId: string; regId: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const registry = await db.pIRRegistry.findFirst({
      where: {
        id: params.regId,
        projectId: params.projectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      include: REGISTRY_INCLUDE,
    });
    if (!registry) return errorResponse('Реестр не найден', 404);

    return successResponse(registry);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения реестра ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const registry = await db.pIRRegistry.findFirst({
      where: {
        id: params.regId,
        projectId: params.projectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true },
    });
    if (!registry) return errorResponse('Реестр не найден', 404);

    const body = await req.json();

    // Проверяем — это action (addDoc/removeDoc) или обычное обновление полей
    const actionParsed = registryActionSchema.safeParse(body);
    if (actionParsed.success) {
      const { action, docId } = actionParsed.data;

      if (action === 'addDoc') {
        // Проверить, что документ существует в том же проекте
        const doc = await db.designDocument.findFirst({
          where: { id: docId, projectId: params.projectId, isDeleted: false },
          select: { id: true },
        });
        if (!doc) return errorResponse('Документ не найден', 404);

        // Защита от дублирования
        const existing = await db.pIRRegistryItem.findFirst({
          where: { registryId: params.regId, docId },
        });
        if (existing) return errorResponse('Документ уже добавлен в реестр', 409);

        // Определить порядковый номер
        const maxOrder = await db.pIRRegistryItem.aggregate({
          where: { registryId: params.regId },
          _max: { order: true },
        });

        await db.pIRRegistryItem.create({
          data: {
            registryId: params.regId,
            docId,
            order: (maxOrder._max.order ?? 0) + 1,
          },
        });
      } else {
        // removeDoc
        await db.pIRRegistryItem.deleteMany({
          where: { registryId: params.regId, docId },
        });
      }

      const updated = await db.pIRRegistry.findFirst({
        where: { id: params.regId },
        include: REGISTRY_INCLUDE,
      });
      return successResponse(updated);
    }

    // Обычное обновление полей реестра
    const fieldsParsed = updatePIRRegistrySchema.safeParse(body);
    if (!fieldsParsed.success) {
      return errorResponse('Ошибка валидации', 400, fieldsParsed.error.issues);
    }

    const updated = await db.pIRRegistry.update({
      where: { id: params.regId },
      data: fieldsParsed.data,
      include: REGISTRY_INCLUDE,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления реестра ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
