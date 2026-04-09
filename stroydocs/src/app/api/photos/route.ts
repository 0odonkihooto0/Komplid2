import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { generateUploadUrl, getDownloadUrl, buildS3Key } from '@/lib/s3-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createPhotoSchema = z.object({
  entityType: z.enum(['WORK_RECORD', 'MATERIAL', 'REMARK', 'WORK_ITEM', 'CONTRACT']),
  entityId: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().positive(),
  gpsLat: z.number().nullish(),
  gpsLng: z.number().nullish(),
  takenAt: z.string().nullish(),
  category: z.enum(['CONFIRMING', 'VIOLATION']).nullish(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();

    const searchParams = req.nextUrl.searchParams;
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const contractId = searchParams.get('contractId');

    let photos;

    if (contractId) {
      // Загружаем все фото договора: прямые (CONTRACT) + фото записей о работах (WORK_RECORD)
      const workRecords = await db.workRecord.findMany({
        where: { contractId, contract: { buildingObject: { organizationId: session.user.organizationId } } },
        select: { id: true, workItem: { select: { name: true } } },
      });
      const workRecordIds = workRecords.map((r) => r.id);
      const workItemNameMap = new Map(workRecords.map((r) => [r.id, r.workItem.name]));

      photos = await db.photo.findMany({
        where: {
          author: { organizationId: session.user.organizationId },
          OR: [
            { entityType: 'CONTRACT', entityId: contractId },
            ...(workRecordIds.length > 0
              ? [{ entityType: 'WORK_RECORD' as const, entityId: { in: workRecordIds } }]
              : []),
          ],
        },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });

      const result = await Promise.all(
        photos.map(async (p) => ({
          ...p,
          downloadUrl: await getDownloadUrl(p.s3Key).catch(() => null),
          workItemName:
            p.entityType === 'WORK_RECORD' ? (workItemNameMap.get(p.entityId) ?? null) : null,
        }))
      );

      return successResponse(result);
    }

    const where: Record<string, unknown> = {
      author: { organizationId: session.user.organizationId },
    };
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    photos = await db.photo.findMany({
      where,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const result = await Promise.all(
      photos.map(async (p) => ({
        ...p,
        downloadUrl: await getDownloadUrl(p.s3Key).catch(() => null),
      }))
    );

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения фото');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();

    const body = await req.json();
    const parsed = createPhotoSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const s3Key = buildS3Key(session.user.organizationId, 'photos', parsed.data.fileName);

    // Генерируем URL до создания записи в БД — если S3 недоступен, запись не создаётся
    const uploadUrl = await generateUploadUrl(s3Key, parsed.data.mimeType);

    const photo = await db.photo.create({
      data: {
        s3Key,
        fileName: parsed.data.fileName,
        mimeType: parsed.data.mimeType,
        size: parsed.data.size,
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
        gpsLat: parsed.data.gpsLat ?? undefined,
        gpsLng: parsed.data.gpsLng ?? undefined,
        takenAt: parsed.data.takenAt ? new Date(parsed.data.takenAt) : undefined,
        category: parsed.data.category ?? undefined,
        authorId: session.user.id,
      },
    });

    return successResponse({ photo, uploadUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    const msg = error instanceof Error ? error.message : 'Неизвестная ошибка';
    logger.error({ err: error }, 'Ошибка создания фото');
    return errorResponse(`Внутренняя ошибка: ${msg}`, 500);
  }
}
