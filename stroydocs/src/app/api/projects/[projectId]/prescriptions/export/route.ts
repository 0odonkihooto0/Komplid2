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
import { generatePrescriptionPdf, type PrescriptionPdfData } from '@/lib/sk-pdf-generator';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  QUALITY_VIOLATION: 'Охрана труда',
  TECHNOLOGY_VIOLATION: 'Нарушение технологии',
  FIRE_SAFETY: 'Пожарная безопасность',
  ECOLOGY: 'Экология',
  DOCUMENTATION: 'Документация',
  OTHER: 'Прочее',
};

const exportSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Выберите хотя бы одно предписание').max(50),
  format: z.enum(['pdf', 'zip']),
});

type Params = { params: { projectId: string } };

/** POST — пакетный экспорт предписаний: ZIP или сводный PDF */
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

    // Загружаем предписания с данными для генерации PDF
    const prescriptions = await db.prescription.findMany({
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
        issuedBy: { select: { firstName: true, lastName: true } },
        responsible: { select: { firstName: true, lastName: true } },
        defects: {
          select: {
            title: true,
            description: true,
            category: true,
            deadline: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { number: 'asc' },
    });

    if (prescriptions.length === 0) return errorResponse('Предписания не найдены', 404);

    // Генерируем PDF-буферы для каждого предписания
    const pdfBuffers: Array<{ buffer: Buffer; name: string }> = [];
    for (const prescription of prescriptions) {
      try {
        const obj = prescription.inspection.buildingObject;
        const inspector = prescription.inspection.inspector;
        const responsible = prescription.responsible;

        // Тип предписания: DEFECT_ELIMINATION → UN (устранение), иное → PR (приостановка)
        const type = prescription.type === 'DEFECT_ELIMINATION' ? 'UN' : 'PR';

        const data: PrescriptionPdfData = {
          type,
          number: prescription.number,
          objectName: obj.name,
          objectAddress: obj.address ?? '',
          issuedAt: prescription.issuedAt.toLocaleDateString('ru-RU'),
          deadline: prescription.deadline
            ? prescription.deadline.toLocaleDateString('ru-RU')
            : 'не установлен',
          inspectorName: `${inspector.lastName} ${inspector.firstName}`,
          responsibleName: responsible
            ? `${responsible.lastName} ${responsible.firstName}`
            : 'не назначен',
          defects: prescription.defects.map((d, i) => ({
            number: i + 1,
            description: d.title + (d.description ? `: ${d.description}` : ''),
            category: CATEGORY_LABELS[d.category] ?? d.category,
            deadline: d.deadline ? d.deadline.toLocaleDateString('ru-RU') : '—',
          })),
          generatedAt: new Date().toLocaleDateString('ru-RU'),
        };

        const buffer = await generatePrescriptionPdf(data);
        pdfBuffers.push({ buffer, name: `prescription-${prescription.number}.pdf` });
      } catch (err) {
        logger.warn({ err, prescriptionId: prescription.id }, 'Пропуск предписания при экспорте');
      }
    }

    if (pdfBuffers.length === 0) return errorResponse('Не удалось сгенерировать ни один PDF', 500);

    if (format === 'pdf') {
      // Сливаем все предписания в один сводный PDF
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
          logger.warn({ err }, 'Пропуск страниц при merge PDF предписаний');
        }
      }
      if (merged.getPageCount() === 0) return errorResponse('Не удалось создать PDF', 500);

      const bytes = await merged.save();
      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="prescriptions-export.pdf"',
        },
      });
    }

    // Формат ZIP: каждое предписание — отдельный файл внутри архива
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

    const fileName = `prescriptions-export-${Date.now()}.zip`;
    const s3Key = buildS3Key(session.user.organizationId, 'sk-exports', fileName);
    await uploadFile(zipBuffer, s3Key, 'application/zip');
    const downloadUrl = await getDownloadUrl(s3Key);

    return successResponse({ downloadUrl, fileName, docsIncluded: pdfBuffers.length });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка экспорта предписаний');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
