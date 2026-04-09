import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { generateIdRegistryPdf } from '@/lib/id-registry-generator';
import { uploadFile, buildS3Key } from '@/lib/s3-utils';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; contractId: string; registryId: string } };

/** POST — сгенерировать PDF реестра ИД */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const registry = await db.idRegistry.findFirst({
      where: { id: params.registryId, contractId: params.contractId },
    });
    if (!registry) return errorResponse('Реестр ИД не найден', 404);

    // Получить все ИД по договору
    const executionDocs = await db.executionDoc.findMany({
      where: { contractId: params.contractId },
      include: {
        workRecord: {
          include: { workItem: { select: { name: true, projectCipher: true } } },
        },
      },
      orderBy: [{ type: 'asc' }, { number: 'asc' }],
    });

    // Получить архивные документы (чертежи)
    const archiveDocs = await db.archiveDocument.findMany({
      where: { contractId: params.contractId },
      orderBy: { createdAt: 'asc' },
    });

    // Получить данные договора и проекта
    const contract = await db.contract.findUnique({
      where: { id: params.contractId },
      select: {
        number: true,
        buildingObject: { select: { name: true, address: true } },
      },
    });

    if (!contract) return errorResponse('Договор не найден', 404);

    // Формируем строки реестра с нумерацией листов
    let currentSheet = 1;
    const rows: Array<{
      number: number;
      docType: string;
      docNumber: string;
      docName: string;
      sheetFrom: number;
      sheetTo: number;
      totalSheets: number;
      status: string;
    }> = [];

    for (const doc of executionDocs) {
      const typeLabel = doc.type === 'AOSR' ? 'АОСР'
        : doc.type === 'OZR' ? 'ОЖР'
        : 'Акт тех. готовности';

      rows.push({
        number: rows.length + 1,
        docType: typeLabel,
        docNumber: doc.number,
        docName: doc.title,
        sheetFrom: currentSheet,
        sheetTo: currentSheet, // упрощение: 1 лист на документ
        totalSheets: 1,
        status: doc.status === 'SIGNED' ? 'Подписан'
          : doc.status === 'IN_REVIEW' ? 'На согласовании'
          : 'Черновик',
      });
      currentSheet++;
    }

    // Добавляем архивные документы (приложения)
    for (const archiveDoc of archiveDocs) {
      const categoryLabel = archiveDoc.category === 'EXECUTION_DRAWINGS' ? 'Исп. схема'
        : archiveDoc.category === 'CERTIFICATES' ? 'Сертификат'
        : archiveDoc.category === 'PERMITS' ? 'Разрешение'
        : 'Документ';

      rows.push({
        number: rows.length + 1,
        docType: categoryLabel,
        docNumber: archiveDoc.sheetNumber || '—',
        docName: archiveDoc.fileName,
        sheetFrom: currentSheet,
        sheetTo: currentSheet,
        totalSheets: 1,
        status: 'Загружен',
      });
      currentSheet++;
    }

    const totalSheets = currentSheet - 1;

    const pdfBuffer = await generateIdRegistryPdf({
      registryName: registry.name,
      contractNumber: contract.number,
      projectName: contract.buildingObject.name,
      projectAddress: contract.buildingObject.address || '',
      generatedAt: new Date().toLocaleDateString('ru-RU'),
      rows,
      totalSheets,
    });

    const fileName = `id-registry-${Date.now()}.pdf`;
    const s3Key = buildS3Key(session.user.organizationId, 'id-registry', fileName);
    await uploadFile(pdfBuffer, s3Key, 'application/pdf');

    await db.idRegistry.update({
      where: { id: params.registryId },
      data: { s3Key, fileName, sheetCount: totalSheets, generatedAt: new Date() },
    });

    return successResponse({ s3Key, fileName, sheetCount: totalSheets });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации реестра ИД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
