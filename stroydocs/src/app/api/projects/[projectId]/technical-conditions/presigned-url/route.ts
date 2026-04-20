import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { generateUploadUrl } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';

const schema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
});

/** POST /api/projects/[projectId]/technical-conditions/presigned-url
 *  Возвращает pre-signed URL для загрузки документа ТУ в Timeweb S3 (TTL: 15 мин).
 */
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
    const parsed = schema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { fileName, mimeType } = parsed.data;
    const s3Key = `tech-conditions/${params.projectId}/${crypto.randomUUID()}/${fileName}`;
    const presignedUrl = await generateUploadUrl(s3Key, mimeType);

    return successResponse({ presignedUrl, s3Key });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'TC presigned-url POST failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
