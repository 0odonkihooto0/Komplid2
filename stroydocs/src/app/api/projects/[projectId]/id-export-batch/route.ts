import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import archiver from 'archiver';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { uploadFile, getDownloadUrl, buildS3Key } from '@/lib/s3-utils';
import { generateExecutionDocXml } from '@/lib/xml/xml-utils';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string } };

const batchXmlSchema = z.object({
  contractId: z.string().uuid().optional(),
});

/** Полный include для XML-генерации */
const XML_DOC_INCLUDE = {
  contract: {
    include: {
      buildingObject: true,
      participants: {
        include: {
          organization: { select: { name: true, inn: true, ogrn: true } },
        },
      },
    },
  },
  workRecord: {
    include: {
      workItem: {
        select: {
          name: true,
          projectCipher: true,
          ksiNode: { select: { code: true, name: true } },
        },
      },
      writeoffs: {
        include: {
          material: {
            include: {
              documents: { take: 3 },
            },
          },
        },
      },
    },
  },
  signatures: {
    include: {
      user: { select: { firstName: true, lastName: true, middleName: true } },
    },
  },
  createdBy: {
    select: { firstName: true, lastName: true, middleName: true },
  },
} as const;

/** POST — пакетный XML-экспорт всех подписанных ИД объекта в ZIP-архив */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта к организации (multi-tenancy)
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true, name: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json().catch(() => ({}));
    const parsed = batchXmlSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { contractId } = parsed.data;

    // Получить все подписанные АОСР и ОЖР объекта (пагинация: макс 200 документов)
    const docs = await db.executionDoc.findMany({
      where: {
        status: 'SIGNED',
        type: { in: ['AOSR', 'OZR'] },
        contract: {
          projectId: params.projectId,
          ...(contractId ? { id: contractId } : {}),
        },
      },
      include: XML_DOC_INCLUDE,
      orderBy: [{ type: 'asc' }, { number: 'asc' }],
      take: 200,
    });

    if (docs.length === 0) {
      return errorResponse('Нет подписанных документов АОСР/ОЖР для экспорта', 400);
    }

    // Генерация XML для каждого документа
    const xmlFiles: Array<{ xml: string; fileName: string; docId: string }> = [];
    const errors: Array<{ docId: string; number: string; error: string }> = [];

    for (const doc of docs) {
      try {
        const xml = generateExecutionDocXml(doc);
        const safeNumber = doc.number.replace(/[^a-zA-Z0-9\u0400-\u04FF._-]/g, '_');
        xmlFiles.push({
          xml,
          fileName: `${doc.type}_${safeNumber}.xml`,
          docId: doc.id,
        });
      } catch (err) {
        logger.warn({ err, docId: doc.id }, 'Пропуск документа при XML-экспорте');
        errors.push({
          docId: doc.id,
          number: doc.number,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (xmlFiles.length === 0) {
      return errorResponse('Не удалось сгенерировать XML ни для одного документа', 500);
    }

    // Сборка ZIP-архива в памяти
    const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = archiver('zip', { zlib: { level: 6 } });

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', (err) => reject(err));

      for (const { xml, fileName } of xmlFiles) {
        archive.append(Buffer.from(xml, 'utf-8'), { name: fileName });
      }

      archive.finalize();
    });

    // Загрузка ZIP в S3
    const zipFileName = `id-xml-export-${Date.now()}.zip`;
    const s3Key = buildS3Key(session.user.organizationId, 'xml-exports', zipFileName);
    await uploadFile(zipBuffer, s3Key, 'application/zip');

    // Обновить xmlExportedAt для экспортированных документов
    const exportedDocIds = xmlFiles.map((f) => f.docId);
    await db.executionDoc.updateMany({
      where: { id: { in: exportedDocIds } },
      data: { xmlExportedAt: new Date() },
    });

    const downloadUrl = await getDownloadUrl(s3Key);

    return successResponse({
      downloadUrl,
      fileName: zipFileName,
      docsExported: xmlFiles.length,
      docsSkipped: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка пакетного XML-экспорта ИД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
