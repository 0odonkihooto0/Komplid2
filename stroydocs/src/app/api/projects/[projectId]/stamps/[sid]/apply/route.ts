import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { s3 } from '@/lib/s3';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { overlayTextStamp } from '@/lib/pdf/stamp-overlay';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; sid: string } };

/**
 * PATCH /api/projects/[projectId]/stamps/[sid]/apply
 * Перегенерировать PDF с наложенным штампом в текущей позиции.
 * Сохраняет результат в S3 под ключом `{s3Key}-applied-{stampId}.pdf`.
 * Операция фоновая — UI не ждёт результата.
 */
export async function PATCH(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const stamp = await db.pdfStamp.findFirst({ where: { id: params.sid } });
    if (!stamp) return errorResponse('Штамп не найден', 404);

    // Скачиваем оригинальный PDF из S3
    const getResult = await s3.send(
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: stamp.s3Key }),
    );
    if (!getResult.Body) {
      return errorResponse('PDF-файл не найден в хранилище', 404);
    }

    // Преобразуем поток в буфер
    const chunks: Uint8Array[] = [];
    for await (const chunk of getResult.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const pdfBuffer = Buffer.concat(chunks);

    // Накладываем штамп с текущими координатами
    const stampedBuffer = await overlayTextStamp(
      pdfBuffer,
      stamp.page,
      stamp.positionX,
      stamp.positionY,
      stamp.stampText,
      stamp.width,
      stamp.height,
    );

    // Сохраняем результат под производным ключом
    const appliedKey = `${stamp.s3Key.replace(/\.pdf$/i, '')}-applied-${stamp.id}.pdf`;
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: appliedKey,
        Body: stampedBuffer,
        ContentType: 'application/pdf',
      }),
    );

    return successResponse({ appliedS3Key: appliedKey });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка перегенерации PDF со штампом');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
