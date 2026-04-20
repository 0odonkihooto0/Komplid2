import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { generateUploadUrl, buildS3Key } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const body: unknown = await req.json();
    if (
      typeof body !== 'object' ||
      body === null ||
      typeof (body as Record<string, unknown>).fileName !== 'string' ||
      typeof (body as Record<string, unknown>).mimeType !== 'string'
    ) {
      return errorResponse('Укажите fileName и mimeType', 400);
    }

    const { fileName, mimeType } = body as { fileName: string; mimeType: string };

    const s3Key = buildS3Key(orgId, 'task-templates', fileName);
    const uploadUrl = await generateUploadUrl(s3Key, mimeType);

    return successResponse({ uploadUrl, s3Key });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-templates/upload] POST:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}
