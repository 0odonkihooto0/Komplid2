import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { uploadFile, getDownloadUrl, buildExecutionDocKey } from '@/lib/s3-utils';
import { generateExecutionDocXml } from '@/lib/xml/xml-utils';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; contractId: string; docId: string } };

/** Полный include для загрузки данных, необходимых XML-генератору */
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

/** POST — XML-экспорт документа ИД по схеме Минстроя */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта к организации (multi-tenancy)
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Загрузка документа с полными связями
    const doc = await db.executionDoc.findFirst({
      where: { id: params.docId, contractId: params.contractId },
      include: XML_DOC_INCLUDE,
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    // Проверка типа — XML поддерживается только для АОСР и ОЖР
    if (doc.type !== 'AOSR' && doc.type !== 'OZR') {
      return errorResponse('XML-экспорт не поддерживается для данного типа документа', 400);
    }

    // Генерация XML
    const xmlString = generateExecutionDocXml(doc);
    const xmlBuffer = Buffer.from(xmlString, 'utf-8');

    // Сохранение в S3
    const fileName = `${doc.type}_${doc.number}.xml`;
    const s3Key = buildExecutionDocKey(
      session.user.organizationId,
      params.contractId,
      doc.type,
      fileName
    );
    await uploadFile(xmlBuffer, s3Key, 'application/xml; charset=utf-8');

    // Обновление записи документа
    const updated = await db.executionDoc.update({
      where: { id: params.docId },
      data: {
        xmlS3Key: s3Key,
        xmlExportedAt: new Date(),
      },
      select: { id: true, xmlS3Key: true, xmlExportedAt: true },
    });

    const downloadUrl = await getDownloadUrl(s3Key);

    return successResponse({
      ...updated,
      downloadUrl,
      fileName,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка XML-экспорта документа ИД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
