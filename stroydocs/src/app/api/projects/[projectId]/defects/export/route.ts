import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { uploadFile, buildS3Key, getDownloadUrl } from '@/lib/s3-utils';
import { logger } from '@/lib/logger';
import { generateDefectsListPdf, type DefectsListPdfData } from '@/lib/sk-pdf-generator';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  QUALITY_VIOLATION: 'Охрана труда',
  TECHNOLOGY_VIOLATION: 'Нарушение технологии',
  FIRE_SAFETY: 'Пожарная безопасность',
  ECOLOGY: 'Экология',
  DOCUMENTATION: 'Документация',
  OTHER: 'Прочее',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Открыт',
  IN_PROGRESS: 'В работе',
  RESOLVED: 'Устранён',
  CONFIRMED: 'Подтверждён',
  REJECTED: 'Отклонён',
};

const exportSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Выберите хотя бы один дефект').max(50),
  format: z.enum(['pdf', 'zip']),
});

type Params = { params: { projectId: string } };

/** POST — экспорт реестра дефектов: сводный PDF или ZIP с одним файлом */
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

    // Загружаем дефекты с ответственным для сводного реестра
    const defects = await db.defect.findMany({
      where: {
        id: { in: ids },
        projectId: params.projectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      include: {
        assignee: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (defects.length === 0) return errorResponse('Дефекты не найдены', 404);

    // Формируем данные для сводного реестра
    const data: DefectsListPdfData = {
      objectName: project.name,
      generatedAt: new Date().toLocaleDateString('ru-RU'),
      defects: defects.map((d, i) => ({
        number: i + 1,
        title: d.title,
        category: CATEGORY_LABELS[d.category] ?? d.category,
        status: STATUS_LABELS[d.status] ?? d.status,
        deadline: d.deadline ? d.deadline.toLocaleDateString('ru-RU') : '—',
        responsible: d.assignee
          ? `${d.assignee.lastName} ${d.assignee.firstName}`
          : 'не назначен',
      })),
    };

    // Для дефектов всегда генерируем один сводный PDF (нет per-defect документа)
    const pdfBuffer = await generateDefectsListPdf(data);

    if (format === 'pdf') {
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="defects-list.pdf"',
        },
      });
    }

    // Формат ZIP: кладём один файл defects-list.pdf внутрь архива
    const archive = archiver('zip', { zlib: { level: 6 } });
    const passThrough = new PassThrough();
    archive.pipe(passThrough);
    archive.append(pdfBuffer, { name: 'defects-list.pdf' });
    await archive.finalize();

    const chunks: Buffer[] = [];
    for await (const chunk of passThrough) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
    }
    const zipBuffer = Buffer.concat(chunks);

    const fileName = `defects-export-${Date.now()}.zip`;
    const s3Key = buildS3Key(session.user.organizationId, 'sk-exports', fileName);
    await uploadFile(zipBuffer, s3Key, 'application/zip');
    const downloadUrl = await getDownloadUrl(s3Key);

    return successResponse({ downloadUrl, fileName, docsIncluded: defects.length });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка экспорта реестра дефектов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
