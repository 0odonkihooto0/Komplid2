import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PDFDocument } from 'pdf-lib';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { uploadFile, buildS3Key, downloadFile, getDownloadUrl } from '@/lib/s3-utils';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; contractId: string } };

const batchExportSchema = z.object({
  docIds: z.array(z.string().uuid()).min(1, 'Выберите хотя бы один документ'),
});

/** POST — пакетный экспорт ИД в единый PDF (pdf-lib мердж) */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = batchExportSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { docIds } = parsed.data;

    // Получить документы с s3Key
    const docs = await db.executionDoc.findMany({
      where: { id: { in: docIds }, contractId: params.contractId },
      orderBy: [{ type: 'asc' }, { number: 'asc' }],
    });

    const docsWithPdf = docs.filter((d) => d.s3Key);
    if (docsWithPdf.length === 0) {
      return errorResponse('Нет документов с PDF. Сначала сгенерируйте PDF для каждого документа.', 400);
    }

    // Создать объединённый PDF
    const mergedPdf = await PDFDocument.create();

    for (const doc of docsWithPdf) {
      try {
        const pdfBytes = await downloadFile(doc.s3Key!);
        const sourcePdf = await PDFDocument.load(pdfBytes);
        const pageCount = sourcePdf.getPageCount();
        const pages = await mergedPdf.copyPages(sourcePdf, Array.from({ length: pageCount }, (_, i) => i));
        pages.forEach((page) => mergedPdf.addPage(page));
      } catch (err) {
        logger.warn({ err, docId: doc.id, s3Key: doc.s3Key }, 'Пропуск документа при мерже (ошибка загрузки)');
      }
    }

    if (mergedPdf.getPageCount() === 0) {
      return errorResponse('Не удалось загрузить ни один PDF для экспорта', 500);
    }

    const mergedBytes = await mergedPdf.save();
    const mergedBuffer = Buffer.from(mergedBytes);

    const fileName = `export-${Date.now()}.pdf`;
    const s3Key = buildS3Key(session.user.organizationId, 'exports', fileName);
    await uploadFile(mergedBuffer, s3Key, 'application/pdf');

    // Создать pre-signed URL для скачивания (TTL 1 час)
    const downloadUrl = await getDownloadUrl(s3Key);

    return successResponse({
      downloadUrl,
      fileName,
      pagesTotal: mergedPdf.getPageCount(),
      docsIncluded: docsWithPdf.length,
      docsSkipped: docs.length - docsWithPdf.length,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка пакетного экспорта PDF');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
