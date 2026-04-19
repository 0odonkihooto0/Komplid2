import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

interface Params { projectId: string; defectId: string }

// Проверяем доступ к дефекту через organizationId
async function getDefectOrThrow(defectId: string, projectId: string, orgId: string) {
  return db.defect.findFirst({
    where: { id: defectId, projectId: projectId, buildingObject: { organizationId: orgId } },
    select: { id: true },
  });
}

// GET /api/projects/[projectId]/defects/[defectId]/normative-refs — список ссылок
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const defect = await getDefectOrThrow(params.defectId, params.projectId, session.user.organizationId);
    if (!defect) return errorResponse('Дефект не найден', 404);

    const refs = await db.defectNormativeRef.findMany({
      where: { defectId: params.defectId },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(refs);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения нормативных ссылок дефекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

const createRefSchema = z.object({
  reference:   z.string().min(1, 'Введите нормативную ссылку'),
  description: z.string().optional(),
});

// POST /api/projects/[projectId]/defects/[defectId]/normative-refs — добавить ссылку
export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const defect = await getDefectOrThrow(params.defectId, params.projectId, session.user.organizationId);
    if (!defect) return errorResponse('Дефект не найден', 404);

    const body: unknown = await req.json();
    const parsed = createRefSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const ref = await db.defectNormativeRef.create({
      data: {
        defectId:    params.defectId,
        reference:   parsed.data.reference,
        description: parsed.data.description,
      },
    });

    return successResponse(ref);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка добавления нормативной ссылки дефекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
