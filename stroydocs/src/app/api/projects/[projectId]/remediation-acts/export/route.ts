import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PDFDocument } from 'pdf-lib';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { uploadFile, buildS3Key, getDownloadUrl } from '@/lib/s3-utils';
import { logger } from '@/lib/logger';
import { generateRemediationActPdf, type RemediationActPdfData } from '@/lib/sk-pdf-generator';

export const dynamic = 'force-dynamic';

const exportSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Выберите хотя бы один акт устранения').max(50),
  format: z.enum(['pdf', 'zip']),
});

type Params = { params: { projectId: string } };

/** Безопасное извлечение строки из unknown */
function safeStr(val: unknown): string {
  return typeof val === 'string' ? val : '';
}

/** POST — пакетный экспорт актов устранения: ZIP или сводный PDF */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    // Multi-tenancy: проверяем принадлежность проекта к организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true, name: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body: unknown = await req.json();
    const parsed = exportSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { ids, format } = parsed.data;

    // Загружаем акты устранения с данными для генерации PDF
    const acts = await db.defectRemediationAct.findMany({
      where: {
        id: { in: ids },
        inspection: { projectId: params.projectId },
      },
      include: {
        inspection: {
          include: {
            inspector: { select: { firstName: true, lastName: true } },
            buildingObject: { select: { name: true, address: true } },
          },
        },
        prescription: { select: { number: true } },
        issuedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { number: 'asc' },
    });

    if (acts.length === 0) return errorResponse('Акты устранения не найдены', 404);

    // Генерируем PDF-буферы для каждого акта устранения
    const pdfBuffers: Array<{ buffer: Buffer; name: string }> = [];
    for (const act of acts) {
      try {
        // Загружаем дефекты по сохранённым ID
        const defects = act.defectIds.length > 0
          ? await db.defect.findMany({
              where: { id: { in: act.defectIds } },
              select: { id: true, title: true, description: true },
              orderBy: { createdAt: 'asc' },
            })
          : [];

        // Детали устранения: { [defectId]: { measures?: string, notes?: string } }
        const details =
          act.remediationDetails !== null &&
          typeof act.remediationDetails === 'object' &&
          !Array.isArray(act.remediationDetails)
            ? (act.remediationDetails as Record<string, unknown>)
            : {};

        const obj = act.inspection.buildingObject;
        const inspector = act.inspection.inspector;

        const data: RemediationActPdfData = {
          number: act.number,
          prescriptionNumber: act.prescription.number,
          objectName: obj.name,
          objectAddress: obj.address ?? '',
          issuedAt: act.issuedAt.toLocaleDateString('ru-RU'),
          inspectorName: `${inspector.lastName} ${inspector.firstName}`,
          defects: defects.map((d, i) => {
            const detail =
              typeof details[d.id] === 'object' && details[d.id] !== null
                ? (details[d.id] as Record<string, unknown>)
                : {};
            return {
              number: i + 1,
              description: d.title + (d.description ? `: ${d.description}` : ''),
              measures: safeStr(detail['measures']),
              notes: safeStr(detail['notes']),
            };
          }),
          generatedAt: new Date().toLocaleDateString('ru-RU'),
        };

        const buffer = await generateRemediationActPdf(data);
        pdfBuffers.push({ buffer, name: `remediation-act-${act.number}.pdf` });
      } catch (err) {
        logger.warn({ err, actId: act.id }, 'Пропуск акта устранения при экспорте');
      }
    }

    if (pdfBuffers.length === 0) return errorResponse('Не удалось сгенерировать ни один PDF', 500);

    if (format === 'pdf') {
      // Сливаем все акты устранения в один сводный PDF
      const merged = await PDFDocument.create();
      for (const { buffer } of pdfBuffers) {
        try {
          const src = await PDFDocument.load(buffer);
          const pages = await merged.copyPages(
            src,
            Array.from({ length: src.getPageCount() }, (_, i) => i),
          );
          pages.forEach((p) => merged.addPage(p));
        } catch (err) {
          logger.warn({ err }, 'Пропуск страниц при merge PDF актов устранения');
        }
      }
      if (merged.getPageCount() === 0) return errorResponse('Не удалось создать PDF', 500);

      const bytes = await merged.save();
      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="remediation-acts-export.pdf"',
        },
      });
    }

    // Формат ZIP: каждый акт устранения — отдельный файл внутри архива
    const archive = archiver('zip', { zlib: { level: 6 } });
    const passThrough = new PassThrough();
    archive.pipe(passThrough);
    for (const { buffer, name } of pdfBuffers) {
      archive.append(buffer, { name });
    }
    await archive.finalize();

    const chunks: Buffer[] = [];
    for await (const chunk of passThrough) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
    }
    const zipBuffer = Buffer.concat(chunks);

    const fileName = `remediation-acts-export-${Date.now()}.zip`;
    const s3Key = buildS3Key(session.user.organizationId, 'sk-exports', fileName);
    await uploadFile(zipBuffer, s3Key, 'application/zip');
    const downloadUrl = await getDownloadUrl(s3Key);

    return successResponse({ downloadUrl, fileName, docsIncluded: pdfBuffers.length });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка экспорта актов устранения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
