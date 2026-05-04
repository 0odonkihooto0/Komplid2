import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; checkId: string; issueId: string } };

const resolveSchema = z.object({
  resolution: z.enum(['manual_fix', 'ignore', 'not_applicable']),
  note: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const check = await db.aiComplianceCheck.findFirst({
      where: { id: params.checkId, projectId: params.projectId },
      select: { id: true },
    });
    if (!check) return errorResponse('Проверка не найдена', 404);

    const issue = await db.aiComplianceIssue.findFirst({
      where: { id: params.issueId, checkId: params.checkId },
      select: { id: true, resolvedAt: true },
    });
    if (!issue) return errorResponse('Нарушение не найдено', 404);

    const body = await req.json().catch(() => ({}));
    const parsed = resolveSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { resolution, note } = parsed.data;

    const updated = await db.aiComplianceIssue.update({
      where: { id: params.issueId },
      data: {
        resolvedAt: new Date(),
        resolvedById: session.user.id,
        resolutionNote: note ? `[${resolution}] ${note}` : `[${resolution}]`,
      },
    });

    logger.info(
      { issueId: params.issueId, resolution, userId: session.user.id },
      '[compliance] Нарушение отмечено как решённое',
    );

    return successResponse(updated);
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') return err as unknown as never;
    logger.error({ err }, '[compliance] Ошибка разрешения нарушения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
