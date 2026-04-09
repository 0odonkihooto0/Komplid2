import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { projectId: string; documentId: string };

// Получить QR-токен для верификации документа
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const document = await db.projectDocument.findFirst({
      where: { id: params.documentId, folder: { projectId: params.projectId } },
      select: { id: true, name: true, qrToken: true },
    });
    if (!document) return errorResponse('Документ не найден', 404);

    const appUrl = process.env.APP_URL ?? 'https://app.stroydocs.ru';
    const verifyUrl = `${appUrl}/docs/verify/${document.qrToken}`;

    return successResponse({
      token: document.qrToken,
      verifyUrl,
      documentName: document.name,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения QR-кода документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
