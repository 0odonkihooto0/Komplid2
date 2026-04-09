import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string } };

/** GET — доступные документы для включения в закрывающий пакет */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Получить все договоры объекта
    const contracts = await db.contract.findMany({
      where: { projectId: params.objectId },
      select: { id: true, number: true, name: true },
      take: 200,
    });
    const contractIds = contracts.map((c) => c.id);

    if (contractIds.length === 0) {
      return successResponse({ executionDocs: [], registries: [], archiveDocs: [], contracts: [] });
    }

    // Параллельно загружаем все типы документов
    const [executionDocs, registries, archiveDocs] = await Promise.all([
      // Подписанные исполнительные документы
      db.executionDoc.findMany({
        where: {
          contractId: { in: contractIds },
          status: 'SIGNED',
        },
        select: {
          id: true,
          type: true,
          number: true,
          title: true,
          status: true,
          s3Key: true,
          contractId: true,
          idCategory: true,
          createdAt: true,
        },
        orderBy: [{ type: 'asc' }, { number: 'asc' }],
        take: 200,
      }),

      // Реестры ИД
      db.idRegistry.findMany({
        where: { contractId: { in: contractIds } },
        select: {
          id: true,
          name: true,
          s3Key: true,
          fileName: true,
          sheetCount: true,
          contractId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),

      // Архивные документы
      db.archiveDocument.findMany({
        where: { contractId: { in: contractIds } },
        select: {
          id: true,
          category: true,
          fileName: true,
          s3Key: true,
          cipher: true,
          issueDate: true,
          contractId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    return successResponse({
      executionDocs,
      registries,
      archiveDocs,
      contracts,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения доступных документов для пакета');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
