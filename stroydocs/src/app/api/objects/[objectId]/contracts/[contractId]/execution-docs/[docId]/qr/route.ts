import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; contractId: string; docId: string } };

// POST — сгенерировать QR-токен для исполнительного документа (идемпотентно)
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта к организации пользователя
    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.executionDoc.findFirst({
      where: {
        id: params.docId,
        contractId: params.contractId,
      },
      select: { id: true, qrToken: true },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    // Если токен уже существует — вернуть без изменений (идемпотентность)
    if (doc.qrToken) {
      const verifyUrl = `${process.env.APP_URL}/docs/verify/${doc.qrToken}`;
      return successResponse({ qrToken: doc.qrToken, verifyUrl });
    }

    const token = randomUUID();
    const verifyUrl = `${process.env.APP_URL}/docs/verify/${token}`;

    await db.executionDoc.update({
      where: { id: params.docId },
      data: { qrToken: token },
    });

    return successResponse({ qrToken: token, verifyUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации QR-кода для исполнительного документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
