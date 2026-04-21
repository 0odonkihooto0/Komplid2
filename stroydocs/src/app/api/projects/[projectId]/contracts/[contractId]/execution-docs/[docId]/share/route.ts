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
  expiresInDays: z.number().int().positive().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; docId: string } }
) {
  const session = await getSessionOrThrow();

  const doc = await db.executionDoc.findFirst({
    where: {
      id: params.docId,
      contractId: params.contractId,
      contract: {
        buildingObject: {
          id: params.projectId,
          workspace: { members: { some: { userId: session.user.id } } },
        },
      },
    },
    select: {
      id: true,
      contract: {
        select: {
          buildingObject: { select: { workspaceId: true } },
        },
      },
    },
  });
  if (!doc) return errorResponse('Документ не найден', 404);

  const workspaceId = doc.contract.buildingObject.workspaceId;
  if (workspaceId) {
    await requireFeature(workspaceId, FEATURES.AOSR_GENERATION);
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createShareSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Ошибка валидации', 400, parsed.error.issues);
  }

  const { expiresInDays } = parsed.data;
  const token = randomBytes(18).toString('base64url');
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  await db.executionDoc.update({
    where: { id: params.docId },
    data: {
      publicShareToken: token,
      publicShareExpiresAt: expiresAt,
      publicShareViewCount: 0,
    },
  });

  return successResponse({
    token,
    url: `/shared/execution-doc/${token}`,
    expiresAt,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; docId: string } }
) {
  const session = await getSessionOrThrow();

  const doc = await db.executionDoc.findFirst({
    where: {
      id: params.docId,
      contractId: params.contractId,
      contract: {
        buildingObject: {
          id: params.projectId,
          workspace: { members: { some: { userId: session.user.id } } },
        },
      },
    },
    select: { id: true },
  });
  if (!doc) return errorResponse('Документ не найден', 404);

  await db.executionDoc.update({
    where: { id: params.docId },
    data: {
      publicShareToken: null,
      publicShareExpiresAt: null,
      publicShareViewCount: 0,
    },
  });

  return successResponse({ revoked: true });
}
