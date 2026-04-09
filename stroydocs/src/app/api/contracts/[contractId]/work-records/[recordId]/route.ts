import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { updateWorkRecordSchema } from '@/lib/validations/work-record';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

async function handleUpdate(
  req: NextRequest,
  params: { contractId: string; recordId: string }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка доступа
    const existing = await db.workRecord.findFirst({
      where: {
        id: params.recordId,
        contractId: params.contractId,
        contract: { buildingObject: { organizationId: session.user.organizationId } },
      },
    });
    if (!existing) return errorResponse('Запись не найдена', 404);

    const body = await req.json();
    const parsed = updateWorkRecordSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { date, ...rest } = parsed.data;

    const updated = await db.workRecord.update({
      where: { id: params.recordId },
      data: {
        ...rest,
        ...(date ? { date: new Date(date) } : {}),
      },
      include: {
        workItem: {
          select: {
            projectCipher: true,
            name: true,
            ksiNode: { select: { code: true, name: true } },
          },
        },
        writeoffs: {
          include: { material: { select: { name: true, unit: true } } },
        },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления записи');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { contractId: string; recordId: string } }
) {
  return handleUpdate(req, params);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { contractId: string; recordId: string } }
) {
  return handleUpdate(req, params);
}
