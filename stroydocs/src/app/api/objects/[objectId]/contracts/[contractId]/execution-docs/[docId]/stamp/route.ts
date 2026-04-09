import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { uploadFile, downloadFile, getDownloadUrl, buildS3Key } from '@/lib/s3-utils';
import { overlayStamp } from '@/lib/pdf/stamp-overlay';
import { stampRequestSchema } from '@/lib/validations/stamp';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; contractId: string; docId: string } };

/**
 * POST — наложить штамп производства работ или «Копия верна» на PDF документа ИД.
 * Принимает нормализованные координаты (0–1), конвертирует в PDF-пункты.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта к организации пользователя
    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.executionDoc.findFirst({
      where: { id: params.docId, contractId: params.contractId },
      select: { id: true, s3Key: true, number: true, title: true },
    });
    if (!doc) return errorResponse('Документ не найден', 404);
    if (!doc.s3Key) return errorResponse('PDF ещё не сгенерирован', 400);

    // Валидация тела запроса
    const body = await req.json();
    const parsed = stampRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { stampType, page, x, y, stampData } = parsed.data;

    // Скачиваем оригинальный PDF из S3
    const pdfBuffer = await downloadFile(doc.s3Key);

    // Конвертация нормализованных координат (0–1) в PDF-пункты
    const { PDFDocument } = await import('pdf-lib');
    const tmpDoc = await PDFDocument.load(pdfBuffer);
    const pages = tmpDoc.getPages();
    if (page < 0 || page >= pages.length) {
      return errorResponse(`Страница ${page} не найдена. Всего: ${pages.length}`, 400);
    }
    const { width, height } = pages[page].getSize();
    const pdfX = x * width;
    // PDF Y: 0 = низ; UI Y: 0 = верх → инвертируем
    const pdfY = (1 - y) * height;

    // Наложение штампа с кириллическим шрифтом
    const stampedPdf = await overlayStamp(
      pdfBuffer,
      stampType,
      page,
      pdfX,
      pdfY,
      {
        docNumber: stampData?.docNumber || doc.number || doc.title,
        date: stampData?.date || new Date().toLocaleDateString('ru-RU'),
        responsibleName: stampData?.responsibleName,
        certifiedByName: stampData?.certifiedByName,
        certifiedByPos: stampData?.certifiedByPos,
      },
    );

    // Загружаем PDF со штампом в S3
    const stampKey = buildS3Key(
      session.user.organizationId,
      'execution-doc-stamps',
      `${stampType}-${doc.id}.pdf`,
    );
    await uploadFile(stampedPdf, stampKey, 'application/pdf');

    // Обновляем запись документа
    await db.executionDoc.update({
      where: { id: params.docId },
      data: {
        stampS3Key: stampKey,
        stampType,
        stampX: pdfX,
        stampY: pdfY,
        stampPage: page,
      },
    });

    const downloadUrl = await getDownloadUrl(stampKey);

    return successResponse({ stampS3Key: stampKey, downloadUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка наложения штампа на исполнительный документ');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
