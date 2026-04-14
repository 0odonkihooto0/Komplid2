import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; journalId: string; remarkId: string } };

/** POST .../remarks/[rid]/return — вернуть на доработку (OPEN) */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const remark = await db.journalEntryRemark.findFirst({
      where: { id: params.remarkId, journalId: params.journalId },
      include: { journal: { select: { projectId: true } } },
    });
    if (!remark || remark.journal?.projectId !== params.projectId) {
      return errorResponse('Замечание не найдено', 404);
    }

    const updated = await db.journalEntryRemark.update({
      where: { id: params.remarkId },
      data: {
        status: 'OPEN',
        resolvedAt: null,
        resolvedById: null,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        issuedBy: { select: { id: true, firstName: true, lastName: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { replies: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка возврата замечания на доработку');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
