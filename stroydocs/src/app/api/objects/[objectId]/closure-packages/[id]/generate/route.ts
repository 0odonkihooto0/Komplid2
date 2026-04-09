import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { uploadFile, getDownloadUrl, buildS3Key, downloadFile } from '@/lib/s3-utils';
import { generateExecutionDocXml } from '@/lib/xml/xml-utils';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; id: string } };

/** Include для XML-генерации исполнительных документов */
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
          material: { include: { documents: { take: 3 } } },
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

/** POST — генерация ZIP-архива закрывающего пакета */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    // Multi-tenancy проверка
    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
      select: { id: true, name: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const pkg = await db.idClosurePackage.findFirst({
      where: { id: params.id, projectId: params.objectId },
    });
    if (!pkg) return errorResponse('Пакет не найден', 404);

    const totalDocs = pkg.executionDocIds.length + pkg.registryIds.length + pkg.archiveDocIds.length;
    if (totalDocs === 0) {
      return errorResponse('Пакет не содержит документов', 400);
    }

    // Собираем файлы для архива
    const files: Array<{ buffer: Buffer; name: string }> = [];
    const errors: Array<{ id: string; error: string }> = [];

    // 1. Исполнительные документы (PDF + XML для подписанных АОСР/ОЖР)
    if (pkg.executionDocIds.length > 0) {
      const execDocs = await db.executionDoc.findMany({
        where: { id: { in: pkg.executionDocIds } },
        include: XML_DOC_INCLUDE,
        take: 200,
      });

      for (const doc of execDocs) {
        // PDF файл документа
        if (doc.s3Key) {
          try {
            const buffer = await downloadFile(doc.s3Key);
            const safeNumber = doc.number.replace(/[^a-zA-Z0-9\u0400-\u04FF._-]/g, '_');
            files.push({ buffer, name: `docs/${doc.type}_${safeNumber}.pdf` });
          } catch (err) {
            errors.push({ id: doc.id, error: `PDF: ${err instanceof Error ? err.message : String(err)}` });
          }
        }

        // XML для подписанных АОСР/ОЖР
        if (doc.status === 'SIGNED' && (doc.type === 'AOSR' || doc.type === 'OZR')) {
          try {
            const xml = generateExecutionDocXml(doc);
            const safeNumber = doc.number.replace(/[^a-zA-Z0-9\u0400-\u04FF._-]/g, '_');
            files.push({
              buffer: Buffer.from(xml, 'utf-8'),
              name: `xml/${doc.type}_${safeNumber}.xml`,
            });
          } catch (err) {
            logger.warn({ err, docId: doc.id }, 'Пропуск XML при генерации пакета');
          }
        }
      }
    }

    // 2. Реестры ИД (PDF)
    if (pkg.registryIds.length > 0) {
      const registries = await db.idRegistry.findMany({
        where: { id: { in: pkg.registryIds } },
        take: 200,
      });

      for (const reg of registries) {
        if (reg.s3Key) {
          try {
            const buffer = await downloadFile(reg.s3Key);
            const safeName = reg.name.replace(/[^a-zA-Z0-9\u0400-\u04FF._-]/g, '_');
            files.push({ buffer, name: `registries/${safeName}.pdf` });
          } catch (err) {
            errors.push({ id: reg.id, error: `Registry: ${err instanceof Error ? err.message : String(err)}` });
          }
        }
      }
    }

    // 3. Архивные документы (PDF)
    if (pkg.archiveDocIds.length > 0) {
      const archiveDocs = await db.archiveDocument.findMany({
        where: { id: { in: pkg.archiveDocIds } },
        take: 200,
      });

      for (const doc of archiveDocs) {
        if (doc.s3Key) {
          try {
            const buffer = await downloadFile(doc.s3Key);
            const safeName = doc.fileName.replace(/[^a-zA-Z0-9\u0400-\u04FF._-]/g, '_');
            files.push({ buffer, name: `archive/${safeName}` });
          } catch (err) {
            errors.push({ id: doc.id, error: `Archive: ${err instanceof Error ? err.message : String(err)}` });
          }
        }
      }
    }

    if (files.length === 0) {
      return errorResponse('Не удалось загрузить ни один файл для пакета', 500);
    }

    // Сборка ZIP-архива в памяти
    const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = archiver('zip', { zlib: { level: 6 } });

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', (err) => reject(err));

      for (const { buffer, name } of files) {
        archive.append(buffer, { name });
      }

      archive.finalize();
    });

    // Загрузка ZIP в S3
    const zipFileName = `closure-package-${pkg.number}-${Date.now()}.zip`;
    const s3Key = buildS3Key(session.user.organizationId, 'closure-packages', zipFileName);
    await uploadFile(zipBuffer, s3Key, 'application/zip');

    // Обновление пакета
    const updated = await db.idClosurePackage.update({
      where: { id: params.id },
      data: {
        s3Key,
        fileName: zipFileName,
        exportedAt: new Date(),
        status: 'ASSEMBLED',
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, middleName: true },
        },
      },
    });

    const downloadUrl = await getDownloadUrl(s3Key);

    return successResponse({
      package: updated,
      downloadUrl,
      filesIncluded: files.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации закрывающего пакета');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
