import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { certifyCopySchema } from '@/lib/validations/archive';
import { successResponse, errorResponse } from '@/utils/api';
import { uploadFile, getDownloadUrl, buildArchiveKey } from '@/lib/s3-utils';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3 } from '@/lib/s3';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const dynamic = 'force-dynamic';

const BUCKET = process.env.S3_BUCKET!;

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; archiveId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.archiveDocument.findFirst({
      where: { id: params.archiveId, contractId: params.contractId },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    if (doc.mimeType !== 'application/pdf') {
      return errorResponse('Штамп "Копия верна" доступен только для PDF-документов', 400);
    }

    const body = await req.json();
    const parsed = certifyCopySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Загрузка PDF из S3
    const s3Response = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: doc.s3Key })
    );
    const bodyBytes = await s3Response.Body?.transformToByteArray();
    if (!bodyBytes) return errorResponse('Не удалось загрузить файл из S3', 500);

    // Наложение штампа через pdf-lib
    const pdfDoc = await PDFDocument.load(bodyBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    // Штамп на первой странице
    if (pages.length > 0) {
      const page = pages[0];
      const { width } = page.getSize();

      const stampText = 'КОПИЯ ВЕРНА';
      const stampInfo = `${parsed.data.certifiedByPos} ${parsed.data.certifiedByName}`;
      const stampDate = new Date().toLocaleDateString('ru-RU');

      const fontSize = 10;
      const stampX = width - 220;
      const stampY = 60;

      // Рамка штампа
      page.drawRectangle({
        x: stampX - 5,
        y: stampY - 5,
        width: 210,
        height: 50,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
        color: rgb(1, 1, 1),
        opacity: 0.9,
      });

      page.drawText(stampText, { x: stampX + 55, y: stampY + 30, size: fontSize + 2, font, color: rgb(0, 0, 0) });
      page.drawText(stampInfo, { x: stampX, y: stampY + 15, size: fontSize - 1, font, color: rgb(0, 0, 0) });
      page.drawText(stampDate, { x: stampX + 70, y: stampY, size: fontSize, font, color: rgb(0, 0, 0) });
    }

    const stampedPdfBytes = await pdfDoc.save();
    const stampedBuffer = Buffer.from(stampedPdfBytes);

    // Загрузка в S3
    const certifiedS3Key = buildArchiveKey(
      session.user.organizationId,
      params.contractId,
      doc.category,
      `certified_${doc.fileName}`
    );

    await uploadFile(stampedBuffer, certifiedS3Key, 'application/pdf');

    // Обновление записи
    const updated = await db.archiveDocument.update({
      where: { id: params.archiveId },
      data: {
        certifiedCopy: true,
        certifiedByName: parsed.data.certifiedByName,
        certifiedByPos: parsed.data.certifiedByPos,
        certifiedS3Key,
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const certifiedDownloadUrl = await getDownloadUrl(certifiedS3Key);

    return successResponse({ ...updated, certifiedDownloadUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка наложения штампа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
