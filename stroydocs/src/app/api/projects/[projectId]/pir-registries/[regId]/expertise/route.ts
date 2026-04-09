import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ExpertiseStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateRegistryExpertiseSchema = z.object({
  expertiseStatus: z.nativeEnum(ExpertiseStatus).nullable().optional(),
  expertiseDate: z.string().datetime().nullable().optional(),
  expertiseComment: z.string().nullable().optional(),
  expertiseS3Keys: z.array(z.string()).optional(),
});

type Params = { params: { projectId: string; regId: string } };

// PATCH — внести данные экспертизы реестра ПИР
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
    const parsed = updateRegistryExpertiseSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.pIRRegistry.update({
      where: { id: params.regId },
      data: {
        expertiseStatus: parsed.data.expertiseStatus,
        expertiseDate: parsed.data.expertiseDate
          ? new Date(parsed.data.expertiseDate)
          : parsed.data.expertiseDate,
        expertiseComment: parsed.data.expertiseComment,
        expertiseS3Keys: parsed.data.expertiseS3Keys,
      },
      select: {
        id: true,
        expertiseStatus: true,
        expertiseDate: true,
        expertiseComment: true,
        expertiseS3Keys: true,
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления экспертизы реестра ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
