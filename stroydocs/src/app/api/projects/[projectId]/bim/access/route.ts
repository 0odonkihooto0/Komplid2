import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { createAccessSchema } from '@/lib/validations/bim';

/** GET /api/projects/[projectId]/bim/access — список прав доступа к ЦИМ */
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const access = await db.bimAccess.findMany({
      where: { projectId: params.projectId },
      take: 200,
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return successResponse(access);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM access GET failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}

/** POST /api/projects/[projectId]/bim/access — добавить права доступа */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = createAccessSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { userId, level, stage, status } = parsed.data;

    // Пользователь должен принадлежать той же организации
    const user = await db.user.findFirst({
      where: { id: userId, organizationId: session.user.organizationId },
    });
    if (!user) return errorResponse('Пользователь не найден', 404);

    const access = await db.bimAccess.create({
      data: {
        userId,
        level,
        stage: stage ?? null,
        status: status ?? null,
        projectId: params.projectId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return successResponse(access);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM access POST failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
