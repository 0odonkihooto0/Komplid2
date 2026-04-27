import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { isFeatureFlagEnabled } from '@/lib/feature-flags';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// GET /api/feature-flags?keys=key1,key2
// Возвращает { flags: { key1: true, key2: false } } для текущего пользователя.
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const { searchParams } = new URL(req.url);
    const keysParam = searchParams.get('keys') ?? '';

    if (!keysParam.trim()) {
      return successResponse({ flags: {} });
    }

    const keys = keysParam
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, 50); // максимум 50 ключей за запрос

    const ctx = {
      userId: session.user.id,
      workspaceId: session.user.activeWorkspaceId ?? undefined,
    };

    const results = await Promise.all(
      keys.map(async (key) => {
        const enabled = await isFeatureFlagEnabled(key, ctx);
        return [key, enabled] as const;
      })
    );

    return successResponse({ flags: Object.fromEntries(results) });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Ошибка сервера', 500);
  }
}
