import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import QRCode from 'qrcode';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { uploadFile, downloadFile, getDownloadUrl, buildS3Key } from '@/lib/s3-utils';
import { overlayQrOnPdf } from '@/lib/pdf/qr-stamp';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; contractId: string; docId: string } };

// POST — наложить QR-штамп на PDF исполнительного документа
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта к организации пользователя
    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.executionDoc.findFirst({
      where: {
        id: params.docId,
        contractId: params.contractId,
      },
      select: { id: true, s3Key: true, qrToken: true, stampS3Key: true },
    });
    if (!doc) return errorResponse('Документ не найден', 404);
    if (!doc.s3Key) return errorResponse('PDF ещё не сгенерирован', 400);

    // Параметры штампа из тела запроса (все опциональные с дефолтами)
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const page = typeof body.page === 'number' ? body.page : 0;
    const x = typeof body.x === 'number' ? body.x : undefined;
    const y = typeof body.y === 'number' ? body.y : undefined;
    const size = typeof body.size === 'number' ? body.size : 80;

    // Если qrToken ещё нет — сгенерировать (аналогично QR-роуту)
    let qrToken = doc.qrToken;
    if (!qrToken) {
      qrToken = randomUUID();
      await db.executionDoc.update({
        where: { id: params.docId },
        data: { qrToken },
      });
    }

    const verifyUrl = `${process.env.APP_URL}/docs/verify/${qrToken}`;

    // Генерация QR-кода как PNG-буфер
    const qrPngBuffer = await QRCode.toBuffer(verifyUrl, {
      width: 200,
      margin: 1,
      type: 'png',
    });

    // Скачиваем оригинальный PDF из S3
    const pdfBuffer = await downloadFile(doc.s3Key);

    // Наложение QR-штампа на PDF
    const stampedPdf = await overlayQrOnPdf(
      pdfBuffer,
      Buffer.from(qrPngBuffer),
      page,
      x,
      y,
      size,
    );

    // Загружаем PDF со штампом в S3
    const stampKey = buildS3Key(
      session.user.organizationId,
      'execution-doc-stamps',
      `qr-stamp-${doc.id}.pdf`,
    );
    await uploadFile(stampedPdf, stampKey, 'application/pdf');

    // Обновляем запись документа: ключ штампа, тип, координаты
    await db.executionDoc.update({
      where: { id: params.docId },
      data: {
        stampS3Key: stampKey,
        stampType: 'qr_stamp',
        stampX: x ?? null,
        stampY: y ?? null,
        stampPage: page,
      },
    });

    // Получаем pre-signed URL для скачивания PDF со штампом
    const downloadUrl = await getDownloadUrl(stampKey);

    return successResponse({ stampS3Key: stampKey, downloadUrl, qrToken, verifyUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка наложения QR-штампа на исполнительный документ');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
