import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/** Маппинг типов ИД на русские названия */
const EXEC_DOC_TYPE_LABELS: Record<string, string> = {
  AOSR: 'АОСР',
  OZR: 'ОЖР',
  TECHNICAL_READINESS_ACT: 'АТГ',
};

// Публичная верификация документа по QR-токену (без авторизации)
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  try {
    // 1. Сначала ищем ProjectDocument
    const projDoc = await db.projectDocument.findFirst({
      where: { qrToken: params.token },
      select: {
        id: true,
        name: true,
        description: true,
        version: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
        updatedAt: true,
        uploadedBy: { select: { firstName: true, lastName: true } },
        folder: {
          select: {
            name: true,
            project: { select: { name: true, address: true } },
          },
        },
      },
    });

    if (projDoc) {
      return successResponse({
        docType: 'project-document' as const,
        name: projDoc.name,
        description: projDoc.description,
        version: projDoc.version,
        fileName: projDoc.fileName,
        fileSize: projDoc.fileSize,
        mimeType: projDoc.mimeType,
        uploadedAt: projDoc.createdAt,
        updatedAt: projDoc.updatedAt,
        uploadedBy: `${projDoc.uploadedBy?.firstName ?? ''} ${projDoc.uploadedBy?.lastName ?? ''}`.trim() || undefined,
        folder: projDoc.folder?.name,
        project: projDoc.folder?.project.name,
        projectAddress: projDoc.folder?.project.address,
      });
    }

    // 2. Затем ищем ExecutionDoc (ИД)
    const execDoc = await db.executionDoc.findFirst({
      where: { qrToken: params.token },
      select: {
        id: true,
        number: true,
        type: true,
        status: true,
        title: true,
        createdAt: true,
        signatures: {
          select: {
            signedAt: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        contract: {
          select: {
            buildingObject: { select: { name: true, address: true } },
          },
        },
      },
    });

    if (execDoc) {
      return successResponse({
        docType: 'execution-doc' as const,
        number: execDoc.number,
        type: execDoc.type,
        typeLabel: EXEC_DOC_TYPE_LABELS[execDoc.type] ?? execDoc.type,
        status: execDoc.status,
        title: execDoc.title,
        createdAt: execDoc.createdAt,
        signatures: execDoc.signatures.map((s) => ({
          signedAt: s.signedAt,
          user: `${s.user.firstName} ${s.user.lastName}`.trim(),
        })),
        project: execDoc.contract.buildingObject.name,
        projectAddress: execDoc.contract.buildingObject.address,
      });
    }

    // 3. Затем ищем DesignDocument (ПИР)
    const designDoc = await db.designDocument.findFirst({
      where: { qrToken: params.token },
      select: {
        id: true,
        number: true,
        name: true,
        status: true,
        docType: true,
        buildingObject: { select: { name: true, address: true } },
      },
    });

    if (designDoc) {
      return successResponse({
        docType: 'design-doc' as const,
        cipher: designDoc.number,
        title: designDoc.name,
        status: designDoc.status,
        documentType: designDoc.docType,
        project: designDoc.buildingObject.name,
        projectAddress: designDoc.buildingObject.address,
      });
    }

    return errorResponse('Документ не найден', 404);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка верификации документа по QR');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
