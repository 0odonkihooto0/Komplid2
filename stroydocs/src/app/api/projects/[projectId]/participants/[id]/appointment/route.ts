import { NextRequest, NextResponse } from 'next/server';
import { AppointmentDocType } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { uploadFile, buildS3Key } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 МБ

/**
 * POST — добавить документ о назначении физического лица.
 * Принимает multipart/form-data: documentType, documentNumber, startDate,
 * endDate, isActive (опционально), file (опционально).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; id: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем принадлежность объекта
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Проверяем физлицо
    const person = await db.objectPerson.findFirst({
      where: { id: params.id, buildingObjectId: params.projectId },
    });
    if (!person) return errorResponse('Физлицо не найдено', 404);

    const formData = await req.formData();

    const documentTypeRaw = formData.get('documentType') as string | null;
    if (!documentTypeRaw || !(documentTypeRaw in AppointmentDocType)) {
      return errorResponse('Укажите корректный тип документа', 400);
    }
    const documentType = documentTypeRaw as AppointmentDocType;

    const documentNumber = (formData.get('documentNumber') as string | null) || undefined;
    const startDateRaw = formData.get('startDate') as string | null;
    const endDateRaw = formData.get('endDate') as string | null;
    const isActiveRaw = formData.get('isActive') as string | null;

    const startDate = startDateRaw ? new Date(startDateRaw) : undefined;
    const endDate = endDateRaw ? new Date(endDateRaw) : undefined;
    // isActive по умолчанию true, если не передано явно false
    const isActive = isActiveRaw === 'false' ? false : true;

    let s3Key: string | undefined;
    let fileName: string | undefined;

    // Загружаем файл если приложен
    const file = formData.get('file') as File | null;
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        return errorResponse('Файл слишком большой (максимум 20 МБ)', 400);
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      s3Key = buildS3Key(session.user.organizationId, `appointments/${params.id}`, file.name);
      fileName = file.name;
      await uploadFile(buffer, s3Key, file.type);
    }

    const appointment = await db.personAppointment.create({
      data: {
        personId: params.id,
        documentType,
        documentNumber,
        startDate,
        endDate,
        isActive,
        s3Key,
        fileName,
      },
    });

    return successResponse(appointment);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания документа о назначении');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
