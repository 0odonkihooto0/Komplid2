import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Агрегированные документы проекта: ИД + архивные документы по всем договорам
export async function GET(
  _req: NextRequest,
  { params }: { params: { objectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const contracts = await db.contract.findMany({
      where: { projectId: params.objectId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        number: true,
        name: true,
        executionDocs: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            number: true,
            title: true,
            type: true,
            status: true,
            createdAt: true,
          },
        },
        archiveDocuments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            fileName: true,
            category: true,
            createdAt: true,
          },
        },
      },
    });

    const data = contracts.map((c) => ({
      id: c.id,
      number: c.number,
      name: c.name,
      executionDocs: c.executionDocs,
      archiveDocs: c.archiveDocuments,
    }));

    return successResponse(data);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения документов проекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
