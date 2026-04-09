import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ExpertiseStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateExpertiseSchema = z.object({
  expertiseStatus: z.nativeEnum(ExpertiseStatus).nullable().optional(),
  expertiseDate: z.string().datetime().nullable().optional(),
  expertiseComment: z.string().nullable().optional(),
});

type Params = { params: { projectId: string; docId: string } };

// PATCH — внести данные экспертизы документа ПИР
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const doc = await db.designDocument.findFirst({
      where: {
        id: params.docId,
        projectId: params.projectId,
        isDeleted: false,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    const body = await req.json();
    const parsed = updateExpertiseSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.designDocument.update({
      where: { id: params.docId },
      data: {
        expertiseStatus: parsed.data.expertiseStatus,
        expertiseDate: parsed.data.expertiseDate ? new Date(parsed.data.expertiseDate) : parsed.data.expertiseDate,
        expertiseComment: parsed.data.expertiseComment,
      },
      select: {
        id: true,
        expertiseStatus: true,
        expertiseDate: true,
        expertiseComment: true,
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления данных экспертизы документа ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
