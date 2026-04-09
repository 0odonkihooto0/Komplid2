import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { generateExecutionDocPdf } from '@/lib/pdf-generator';
import { uploadFile, buildExecutionDocKey } from '@/lib/s3-utils';
import { logger } from '@/lib/logger';
import type { OzrTemplateData } from '@/types/templates';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; contractId: string; docId: string } };

/** POST — автозаполнение ОЖР из созданных АОСР + перегенерация PDF */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.executionDoc.findFirst({
      where: { id: params.docId, contractId: params.contractId, type: 'OZR' },
    });
    if (!doc) return errorResponse('Документ ОЖР не найден', 404);

    // Собрать все АОСР по данному договору
    const aosrDocs = await db.executionDoc.findMany({
      where: {
        contractId: params.contractId,
        type: 'AOSR',
      },
      include: {
        workRecord: {
          include: {
            workItem: { select: { name: true, projectCipher: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Получить участников договора и данные проекта
    const contract = await db.contract.findUnique({
      where: { id: params.contractId },
      include: {
        buildingObject: { select: { name: true, address: true } },
        participants: {
          include: { organization: { select: { name: true } } },
        },
      },
    });
    if (!contract) return errorResponse('Договор не найден', 404);

    const participants = contract.participants.map((p) => ({
      role: p.role === 'DEVELOPER' ? 'Застройщик'
        : p.role === 'CONTRACTOR' ? 'Подрядчик'
        : p.role === 'SUPERVISION' ? 'Стройконтроль'
        : 'Субподрядчик',
      organizationName: p.organization?.name || '',
      representativeName: '___________________',
      position: '___________________',
      appointmentOrder: undefined,
    }));

    // Формируем записи разделов 3 и 5 из АОСР
    const records = aosrDocs.map((aosr) => ({
      date: aosr.createdAt.toLocaleDateString('ru-RU'),
      workName: aosr.workRecord?.workItem.name || aosr.title,
      location: aosr.workRecord?.location || '—',
      normative: aosr.workRecord?.normative || '—',
      status: aosr.status === 'SIGNED' ? 'Подписан' : 'В работе',
    }));

    const templateData: OzrTemplateData = {
      number: doc.number,
      date: new Date().toLocaleDateString('ru-RU'),
      projectName: contract.buildingObject.name,
      projectAddress: contract.buildingObject.address || '',
      contractNumber: contract.number,
      participants,
      records,
    };

    // Генерируем обновлённый PDF
    const pdfBuffer = await generateExecutionDocPdf('OZR', templateData);

    const fileName = `ozr-${doc.number.replace(/[^a-zA-Z0-9-]/g, '_')}-updated.pdf`;
    const s3Key = buildExecutionDocKey(
      session.user.organizationId,
      params.contractId,
      'OZR',
      fileName
    );

    await uploadFile(pdfBuffer, s3Key, 'application/pdf');

    // Обновить документ с новым PDF
    await db.executionDoc.update({
      where: { id: params.docId },
      data: { s3Key, fileName, generatedAt: new Date() },
    });

    return successResponse({
      message: `ОЖР обновлён: ${aosrDocs.length} записей из АОСР`,
      aosrCount: aosrDocs.length,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка автозаполнения ОЖР из АОСР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
