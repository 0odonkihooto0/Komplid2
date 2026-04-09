import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { createInputControlActSchema } from '@/lib/validations/input-control';
import { generateUploadUrl, getDownloadUrl, buildInputControlActKey } from '@/lib/s3-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/** Проверка доступа к договору через организацию */
async function verifyContractAccess(contractId: string, organizationId: string) {
  return db.contract.findFirst({
    where: { id: contractId, buildingObject: { organizationId } },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { contractId: string; recordId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await verifyContractAccess(params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const where = {
      recordId: params.recordId,
      record: { batch: { material: { contractId: params.contractId } } },
    };

    const [acts, total] = await Promise.all([
      db.inputControlAct.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.inputControlAct.count({ where }),
    ]);

    const actsWithUrls = await Promise.all(
      acts.map(async (act) => ({
        ...act,
        downloadUrl: await getDownloadUrl(act.s3Key),
      }))
    );

    return successResponse({ data: actsWithUrls, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения актов ВК');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { contractId: string; recordId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const contract = await verifyContractAccess(params.contractId, session.user.organizationId);
    if (!contract) return errorResponse('Договор не найден', 404);

    // Проверяем, что запись ЖВК принадлежит этому договору
    const record = await db.inputControlRecord.findFirst({
      where: {
        id: params.recordId,
        batch: { material: { contractId: params.contractId } },
      },
    });
    if (!record) return errorResponse('Запись ЖВК не найдена', 404);

    const body = await req.json();
    const parsed = createInputControlActSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const s3Key = buildInputControlActKey(
      session.user.organizationId,
      params.contractId,
      params.recordId,
      parsed.data.fileName
    );

    const act = await db.inputControlAct.create({
      data: {
        s3Key,
        fileName: parsed.data.fileName,
        mimeType: parsed.data.mimeType,
        size: parsed.data.size,
        recordId: params.recordId,
      },
    });

    const uploadUrl = await generateUploadUrl(s3Key, parsed.data.mimeType);

    return successResponse({ act, uploadUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания акта ВК');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
