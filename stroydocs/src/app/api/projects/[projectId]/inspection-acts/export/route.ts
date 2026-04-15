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
import { generateInspectionActPdf, type InspectionActPdfData } from '@/lib/sk-pdf-generator';

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
  ids: z.array(z.string().uuid()).min(1, 'Выберите хотя бы одну запись').max(50),
  format: z.enum(['pdf', 'zip']),
});

type Params = { params: { projectId: string } };

/** POST — пакетный экспорт актов проверки: ZIP или сводный PDF */
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

    // Загружаем акты с данными для генерации PDF
    const acts = await db.inspectionAct.findMany({
      where: {
        id: { in: ids },
        inspection: { projectId: params.projectId },
      },
      include: {
        inspection: {
          include: {
            inspector: { select: { firstName: true, lastName: true } },
            responsible: { select: { firstName: true, lastName: true } },
            buildingObject: { select: { name: true, address: true } },
            defects: {
              select: {
                title: true,
                description: true,
                category: true,
                deadline: true,
                requiresSuspension: true,
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        issuedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { number: 'asc' },
    });

    if (acts.length === 0) return errorResponse('Акты не найдены', 404);

    // Генерируем PDF-буферы для каждого акта
    const pdfBuffers: Array<{ buffer: Buffer; name: string }> = [];
    for (const act of acts) {
      try {
        const { inspection } = act;
        const obj = inspection.buildingObject;
        const inspector = inspection.inspector;
        const responsible = inspection.responsible;

        const data: InspectionActPdfData = {
          number: act.number,
          objectName: obj.name,
          objectAddress: obj.address ?? '',
          inspectedAt: (inspection.completedAt ?? inspection.startedAt).toLocaleDateString('ru-RU'),
          inspectorName: `${inspector.lastName} ${inspector.firstName}`,
          inspectorOrg: '',
          responsibleName: responsible
            ? `${responsible.lastName} ${responsible.firstName}`
            : 'не назначен',
          contractorPresent: inspection.contractorPresent ?? null,
          defects: inspection.defects.map((d, i) => ({
            number: i + 1,
            category: CATEGORY_LABELS[d.category] ?? d.category,
            description: d.title + (d.description ? `: ${d.description}` : ''),
            deadline: d.deadline ? d.deadline.toLocaleDateString('ru-RU') : '—',
            requiresSuspension: d.requiresSuspension,
          })),
          generatedAt: new Date().toLocaleDateString('ru-RU'),
        };

        const buffer = await generateInspectionActPdf(data);
        pdfBuffers.push({ buffer, name: `inspection-act-${act.number}.pdf` });
      } catch (err) {
        logger.warn({ err, actId: act.id }, 'Пропуск акта проверки при экспорте');
      }
    }

    if (pdfBuffers.length === 0) return errorResponse('Не удалось сгенерировать ни один PDF', 500);

    if (format === 'pdf') {
      // Сливаем все акты в один сводный PDF
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
          logger.warn({ err }, 'Пропуск страниц при merge PDF актов проверки');
        }
      }
      if (merged.getPageCount() === 0) return errorResponse('Не удалось создать PDF', 500);

      const bytes = await merged.save();
      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="inspection-acts-export.pdf"',
        },
      });
    }

    // Формат ZIP: каждый акт — отдельный файл внутри архива
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

    const fileName = `inspection-acts-${Date.now()}.zip`;
    const s3Key = buildS3Key(session.user.organizationId, 'sk-exports', fileName);
    await uploadFile(zipBuffer, s3Key, 'application/zip');
    const downloadUrl = await getDownloadUrl(s3Key);

    return successResponse({ downloadUrl, fileName, docsIncluded: pdfBuffers.length });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка экспорта актов проверки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
