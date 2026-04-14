import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createRemarkReplySchema } from '@/lib/validations/journal-schemas';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; journalId: string; remarkId: string } };

/** Проверяем принадлежность замечания к проекту и организации */
async function resolveRemark(projectId: string, journalId: string, remarkId: string, organizationId: string) {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
  if (!project) return null;

  const remark = await db.journalEntryRemark.findFirst({
    where: { id: remarkId, journalId },
    include: { journal: { select: { projectId: true } } },
  });
  if (!remark || remark.journal?.projectId !== projectId) return null;
  return remark;
}

/** GET .../remarks/[rid]/replies — список ответов */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const remark = await resolveRemark(
      params.projectId,
      params.journalId,
      params.remarkId,
      session.user.organizationId,
    );
    if (!remark) return errorResponse('Замечание не найдено', 404);

    const replies = await db.journalRemarkReply.findMany({
      where: { remarkId: params.remarkId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(replies);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения ответов на замечание');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST .../remarks/[rid]/replies — добавить ответ */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const remark = await resolveRemark(
      params.projectId,
      params.journalId,
      params.remarkId,
      session.user.organizationId,
    );
    if (!remark) return errorResponse('Замечание не найдено', 404);

    const body = await req.json();
    const parsed = createRemarkReplySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const reply = await db.journalRemarkReply.create({
      data: {
        title: parsed.data.title ?? null,
        text: parsed.data.text,
        remarkId: params.remarkId,
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(reply);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания ответа на замечание');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
