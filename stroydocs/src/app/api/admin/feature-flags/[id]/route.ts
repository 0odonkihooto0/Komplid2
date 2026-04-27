import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { requireSystemAdmin } from '@/lib/permissions';
import { invalidateFlagCache } from '@/lib/feature-flags';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  description: z.string().max(512).optional(),
  enabled: z.boolean().optional(),
  rolloutPercent: z.number().int().min(0).max(100).optional(),
  audiences: z
    .object({
      workspaceIds: z.array(z.string()).optional(),
      userIds: z.array(z.string()).optional(),
      intents: z.array(z.string()).optional(),
    })
    .nullable()
    .optional(),
});

// PATCH /api/admin/feature-flags/[id] — обновить флаг
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionOrThrow();
    requireSystemAdmin(session);

    const flag = await db.featureFlag.findUnique({ where: { id: params.id } });
    if (!flag) return errorResponse('Флаг не найден', 404);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const updated = await db.featureFlag.update({
      where: { id: params.id },
      data: {
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.enabled !== undefined && { enabled: parsed.data.enabled }),
        ...(parsed.data.rolloutPercent !== undefined && { rolloutPercent: parsed.data.rolloutPercent }),
        ...(parsed.data.audiences !== undefined && {
          audiences: parsed.data.audiences as object | null ?? undefined,
        }),
      },
    });

    // Инвалидируем кеш Redis для мгновенного kill-switch
    await invalidateFlagCache(flag.key);

    return successResponse(updated);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Ошибка сервера', 500);
  }
}

// DELETE /api/admin/feature-flags/[id] — удалить флаг
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionOrThrow();
    requireSystemAdmin(session);

    const flag = await db.featureFlag.findUnique({ where: { id: params.id } });
    if (!flag) return errorResponse('Флаг не найден', 404);

    await db.featureFlag.delete({ where: { id: params.id } });
    await invalidateFlagCache(flag.key);

    return successResponse({ deleted: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Ошибка сервера', 500);
  }
}
