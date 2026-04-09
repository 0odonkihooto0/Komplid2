import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { s3 } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import archiver from 'archiver';
import { Readable } from 'stream';
import type { Readable as NodeReadable } from 'stream';

export const dynamic = 'force-dynamic';

// Скачать все документы из папки одним ZIP-архивом
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверить доступ к проекту через organizationId
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true, name: true },
    });
    if (!project) {
      return new NextResponse('Проект не найден', { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('folderId');
    if (!folderId) {
      return new NextResponse('Параметр folderId обязателен', { status: 400 });
    }

    // Проверить что папка принадлежит проекту
    const folder = await db.projectFolder.findFirst({
      where: { id: folderId, projectId: params.projectId },
      select: { id: true, name: true },
    });
    if (!folder) {
      return new NextResponse('Папка не найдена', { status: 404 });
    }

    // Получить все документы в папке
    const documents = await db.projectDocument.findMany({
      where: { folderId },
      select: { id: true, s3Key: true, fileName: true },
      orderBy: { createdAt: 'asc' },
    });

    if (documents.length === 0) {
      return new NextResponse('Папка пуста', { status: 404 });
    }

    // Создать ZIP через archiver и стримить в Response
    const archive = archiver('zip', { zlib: { level: 6 } });

    // Добавить каждый документ в архив
    const addFilesToArchive = async () => {
      for (const doc of documents) {
        try {
          const s3Response = await s3.send(
            new GetObjectCommand({
              Bucket: process.env.S3_BUCKET!,
              Key: doc.s3Key,
            }),
          );

          if (s3Response.Body) {
            const nodeStream = s3Response.Body as NodeReadable;
            archive.append(Readable.from(nodeStream), { name: doc.fileName });
          }
        } catch (fileErr) {
          // Пропустить недоступный файл с предупреждением
          logger.warn({ err: fileErr, docId: doc.id }, 'Не удалось добавить файл в архив');
        }
      }
      await archive.finalize();
    };

    // Запустить формирование архива асинхронно
    addFilesToArchive().catch((err) =>
      logger.error({ err }, 'Ошибка формирования ZIP-архива'),
    );

    // Конвертировать archiver output stream в ReadableStream для Response
    const readableStream = new ReadableStream({
      start(controller) {
        archive.on('data', (chunk: Buffer) => controller.enqueue(chunk));
        archive.on('end', () => controller.close());
        archive.on('error', (err) => controller.error(err));
      },
    });

    const archiveName = encodeURIComponent(`${folder.name}.zip`);

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename*=UTF-8''${archiveName}`,
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания ZIP-архива документов');
    return new NextResponse('Внутренняя ошибка сервера', { status: 500 });
  }
}
