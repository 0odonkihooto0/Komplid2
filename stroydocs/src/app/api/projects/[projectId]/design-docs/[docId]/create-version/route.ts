import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; docId: string } };

/**
 * POST /api/projects/[projectId]/design-docs/[docId]/create-version
 * Создать новую версию документа ПИР с наследованием замечаний (DesignDocComment).
 * parentDocId указывает на исходный документ, version++.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const original = await db.designDocument.findFirst({
      where: {
        id: params.docId,
        projectId: params.projectId,
        isDeleted: false,
        buildingObject: { organizationId: session.user.organizationId },
      },
    });
    if (!original) return errorResponse('Документ не найден', 404);

    // Определить максимальную версию в семействе документов
    const maxResult = await db.designDocument.aggregate({
      where: {
        OR: [
          { id: params.docId },
          { parentDocId: params.docId },
        ],
      },
      _max: { version: true },
    });
    const newVersion = (maxResult._max.version ?? 1) + 1;

    // Загрузить замечания исходного документа для наследования
    const sourceComments = await db.designDocComment.findMany({
      where: { docId: params.docId },
    });

    const newDoc = await db.$transaction(async (tx) => {
      const doc = await tx.designDocument.create({
        data: {
          number: `${original.number}-v${newVersion}`,
          name: original.name,
          docType: original.docType,
          category: original.category,
          version: newVersion,
          status: 'CREATED',
          parentDocId: params.docId,
          responsibleOrgId: original.responsibleOrgId,
          responsibleUserId: original.responsibleUserId,
          notes: original.notes,
          projectId: params.projectId,
          authorId: session.user.id,
          s3Keys: [],
        },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          parentDoc: { select: { id: true, number: true, version: true } },
        },
      });

      // Наследовать замечания: скопировать все замечания в новую версию
      if (sourceComments.length > 0) {
        await tx.designDocComment.createMany({
          data: sourceComments.map((c) => ({
            number: c.number,
            text: c.text,
            commentType: c.commentType,
            urgency: c.urgency,
            deadline: c.deadline,
            status: c.status,
            requiresAttention: c.requiresAttention,
            docId: doc.id,
            authorId: c.authorId,
            assigneeId: c.assigneeId,
            response: c.response,
            respondedAt: c.respondedAt,
            respondedById: c.respondedById,
            s3Keys: c.s3Keys,
            plannedResolutionDate: c.plannedResolutionDate,
            suggestion: c.suggestion,
            watchers: c.watchers,
          })),
        });
      }

      return doc;
    });

    return successResponse(newDoc);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания новой версии документа ПИР (create-version)');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
