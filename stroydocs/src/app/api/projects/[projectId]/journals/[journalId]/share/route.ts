import { randomBytes } from 'crypto';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { requireFeature } from '@/lib/subscriptions/require-feature';
import { FEATURES } from '@/lib/subscriptions/features';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const createShareSchema = z.object({
  expiresInDays: z.number().int().positive().nullable().optional(),
});

type Params = { params: { projectId: string; journalId: string } };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSessionOrThrow();

  const project = await db.buildingObject.findFirst({
    where: { id: params.projectId, organizationId: session.user.organizationId },
    select: { id: true, workspaceId: true },
  });
  if (!project) return errorResponse('Объект не найден', 404);

  const journal = await db.specialJournal.findFirst({
    where: { id: params.journalId, projectId: params.projectId },
    select: { id: true },
  });
  if (!journal) return errorResponse('Журнал не найден', 404);

  if (project.workspaceId) {
    await requireFeature(project.workspaceId, FEATURES.JOURNALS_BASIC);
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createShareSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Ошибка валидации', 400, parsed.error.issues);
  }

  const { expiresInDays } = parsed.data;
  const token = randomBytes(18).toString('base64url');
  const expiresAt =
    expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;

  await db.specialJournal.update({
    where: { id: params.journalId },
    data: {
      publicShareToken: token,
      publicShareExpiresAt: expiresAt,
      publicShareViewCount: 0,
    },
  });

  return successResponse({
    token,
    url: `/shared/journal/${token}`,
    expiresAt,
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
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

  await db.specialJournal.update({
    where: { id: params.journalId },
    data: {
      publicShareToken: null,
      publicShareExpiresAt: null,
      publicShareViewCount: 0,
    },
  });

  return successResponse({ revoked: true });
}
