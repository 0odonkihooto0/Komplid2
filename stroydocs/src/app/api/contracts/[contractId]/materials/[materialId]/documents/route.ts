import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { uploadFile, buildMaterialDocKey, getDownloadUrl } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { contractId: string; materialId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка доступа
    const material = await db.material.findFirst({
      where: {
        id: params.materialId,
        contractId: params.contractId,
        contract: { buildingObject: { organizationId: session.user.organizationId } },
      },
    });
    if (!material) return errorResponse('Материал не найден', 404);

    const documents = await db.materialDocument.findMany({
      where: { materialId: params.materialId },
      orderBy: { uploadedAt: 'desc' },
    });

    // Добавляем pre-signed URL к каждому документу
    const docsWithUrls = await Promise.all(
      documents.map(async (doc) => ({
        ...doc,
        downloadUrl: await getDownloadUrl(doc.s3Key),
      }))
    );

    return successResponse(docsWithUrls);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения документов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { contractId: string; materialId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка доступа
    const material = await db.material.findFirst({
      where: {
        id: params.materialId,
        contractId: params.contractId,
        contract: { buildingObject: { organizationId: session.user.organizationId } },
      },
    });
    if (!material) return errorResponse('Материал не найден', 404);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;

    if (!file) return errorResponse('Файл не прикреплён', 400);
    if (!type || !['PASSPORT', 'CERTIFICATE', 'PROTOCOL'].includes(type)) {
      return errorResponse('Укажите тип документа', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const s3Key = buildMaterialDocKey(params.contractId, params.materialId, file.name);

    await uploadFile(buffer, s3Key, file.type);

    const document = await db.materialDocument.create({
      data: {
        type: type as 'PASSPORT' | 'CERTIFICATE' | 'PROTOCOL',
        fileName: file.name,
        s3Key,
        mimeType: file.type,
        size: file.size,
        materialId: params.materialId,
      },
    });

    return successResponse(document);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    const msg = error instanceof Error ? error.message : 'Неизвестная ошибка';
    logger.error({ err: error }, 'Ошибка загрузки документа');
    return errorResponse(`Внутренняя ошибка: ${msg}`, 500);
  }
}
