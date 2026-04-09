import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { getDownloadUrl } from '@/lib/s3-utils';
import type { ArchiveCategory } from '@prisma/client';

export const dynamic = 'force-dynamic';

/** Проверка доступа к договору */
async function verifyContractAccess(contractId: string, organizationId: string) {
  return db.contract.findFirst({
    where: { id: contractId, buildingObject: { organizationId } },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await verifyContractAccess(params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get('category') as ArchiveCategory | null;

    const docs = await db.archiveDocument.findMany({
      where: {
        contractId: params.contractId,
        ...(category && { category }),
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const docsWithUrls = await Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        downloadUrl: await getDownloadUrl(doc.s3Key).catch(() => null),
        certifiedDownloadUrl: doc.certifiedS3Key
          ? await getDownloadUrl(doc.certifiedS3Key).catch(() => null)
          : null,
      }))
    );

    return successResponse(docsWithUrls);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения архивных документов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
