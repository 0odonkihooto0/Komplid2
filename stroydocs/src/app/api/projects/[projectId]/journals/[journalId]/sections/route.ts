import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; journalId: string } };

/** GET /api/projects/[projectId]/journals/[journalId]/sections — разделы журнала с записями */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const journal = await db.specialJournal.findFirst({
      where: { id: params.journalId, projectId: params.projectId },
      select: { id: true },
    });
    if (!journal) return errorResponse('Журнал не найден', 404);

    const sections = await db.journalSection.findMany({
      where: { journalId: params.journalId },
      orderBy: { sectionNumber: 'asc' },
      include: {
        entries: {
          take: 50,
          orderBy: { entryNumber: 'asc' },
          include: {
            author: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    return successResponse(sections);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения разделов журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
