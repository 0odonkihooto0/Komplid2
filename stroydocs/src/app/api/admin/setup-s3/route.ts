import { NextRequest, NextResponse } from 'next/server';
import { PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { s3 } from '@/lib/s3';
import { errorResponse, successResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/setup-s3
 *
 * Одноразовый эндпоинт: применяет CORS-политику к S3-бакету.
 * Нужно вызвать один раз после деплоя на новом окружении.
 *
 * Authorization: Bearer <ADMIN_SECRET>  ИЛИ  сессия с ролью ADMIN
 */
export async function POST(req: NextRequest) {
  // Двойная проверка: Bearer-секрет (для CI/скриптов) ИЛИ сессия администратора
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  const secret = process.env.ADMIN_SECRET;

  if (!secret || token !== secret) {
    // Если секрет не подошёл — проверяем сессию с ролью ADMIN
    try {
      const session = await getSessionOrThrow();
      if (session.user.role !== 'ADMIN') {
        return errorResponse('Недостаточно прав', 403);
      }
    } catch (e) {
      if (e instanceof NextResponse) return e;
      return errorResponse('Unauthorized', 401);
    }
  }

  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    return errorResponse('S3_BUCKET не задан', 500);
  }

  try {
    await s3.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              // Разрешаем загрузку файлов через pre-signed URL из браузера
              AllowedHeaders: ['*'],
              AllowedMethods: ['PUT', 'GET', 'HEAD', 'POST', 'DELETE'],
              AllowedOrigins: ['*'],
              ExposeHeaders: ['ETag'],
              MaxAgeSeconds: 3000,
            },
          ],
        },
      })
    );

    logger.info({ bucket }, 'CORS-политика S3 успешно применена');
    return successResponse({ message: `CORS настроен для бакета ${bucket}` });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ err: error }, 'Ошибка настройки CORS S3');
    return errorResponse(`Ошибка настройки CORS: ${msg}`, 500);
  }
}
