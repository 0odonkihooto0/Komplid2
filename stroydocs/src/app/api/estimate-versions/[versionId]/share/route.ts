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
  mode: z.enum(['VIEW', 'COMPARE']).default('VIEW'),
  compareWithVersionId: z.string().optional(),
  expiresInDays: z.number().int().positive().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { versionId: string } }
) {
  const session = await getSessionOrThrow();

  const version = await db.estimateVersion.findFirst({
    where: {
      id: params.versionId,
      contract: {
        buildingObject: {
          workspace: { members: { some: { userId: session.user.id } } },
        },
      },
    },
    select: { id: true, name: true, contract: { select: { buildingObject: { select: { workspaceId: true } } } } },
  });
  if (!version) return errorResponse('Версия сметы не найдена', 404);

  const workspaceId = version.contract.buildingObject.workspaceId;
  if (workspaceId) {
    await requireFeature(workspaceId, FEATURES.ESTIMATES_PUBLIC_LINK);
  }

  const body = await req.json();
  const parsed = createShareSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Ошибка валидации', 400, parsed.error.issues);
  }

  const { mode, compareWithVersionId, expiresInDays } = parsed.data;
  const token = randomBytes(18).toString('base64url'); // ~24 символа URL-safe
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  await db.estimateVersion.update({
    where: { id: params.versionId },
    data: {
      publicShareToken: token,
      publicShareMode: mode,
      publicCompareWithVersionId: compareWithVersionId ?? null,
      publicShareExpiresAt: expiresAt,
      publicShareViewCount: 0,
    },
  });

  return successResponse({
    token,
    url: `/shared/estimate/${token}`,
    expiresAt,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { versionId: string } }
) {
  const session = await getSessionOrThrow();

  const version = await db.estimateVersion.findFirst({
    where: {
      id: params.versionId,
      contract: {
        buildingObject: {
          workspace: { members: { some: { userId: session.user.id } } },
        },
      },
    },
    select: { id: true },
  });
  if (!version) return errorResponse('Версия сметы не найдена', 404);

  await db.estimateVersion.update({
    where: { id: params.versionId },
    data: {
      publicShareToken: null,
      publicShareMode: null,
      publicCompareWithVersionId: null,
      publicShareExpiresAt: null,
    },
  });

  return successResponse({ revoked: true });
}
