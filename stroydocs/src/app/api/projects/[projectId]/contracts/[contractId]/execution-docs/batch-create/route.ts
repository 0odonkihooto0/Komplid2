import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { generateExecutionDocPdf } from '@/lib/pdf-generator';
import { uploadFile, buildExecutionDocKey } from '@/lib/s3-utils';
import { logger } from '@/lib/logger';
import { classifyExecutionDoc } from '@/lib/id-classification';
import type { AosrTemplateData } from '@/types/templates';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; contractId: string } };

const batchCreateSchema = z.object({
  workRecordIds: z.array(z.string().uuid()).min(1, 'Выберите хотя бы одну запись о работе'),
});

/** POST — пакетное создание АОСР по выбранным записям о работах */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = batchCreateSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { workRecordIds } = parsed.data;

    // Проверить, что все записи принадлежат данному договору
    const workRecords = await db.workRecord.findMany({
      where: { id: { in: workRecordIds }, contractId: params.contractId },
      include: {
        workItem: {
          include: { ksiNode: { select: { code: true, name: true } } },
        },
        writeoffs: {
          include: {
            material: {
              select: {
                name: true,
                invoiceNumber: true,
                documents: { select: { type: true, fileName: true } },
              },
            },
          },
        },
      },
    });

    if (workRecords.length === 0) {
      return errorResponse('Записи о работах не найдены', 404);
    }

    // Получить участников и данные договора
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

    const results: Array<{ workRecordId: string; docId: string; success: boolean; error?: string }> = [];

    for (const record of workRecords) {
      try {
        // Проверить, нет ли уже АОСР для этой записи
        const existing = await db.executionDoc.findFirst({
          where: { workRecordId: record.id, type: 'AOSR' },
        });
        if (existing) {
          results.push({
            workRecordId: record.id,
            docId: existing.id,
            success: false,
            error: 'АОСР уже существует',
          });
          continue;
        }

        // Генерация номера
        const count = await db.executionDoc.count({
          where: { contractId: params.contractId, type: 'AOSR' },
        });
        const number = `AOSR-${String(count + 1).padStart(3, '0')}`;
        const title = `АОСР — ${record.workItem.name}`;

        // Создать документ
        const doc = await db.executionDoc.create({
          data: {
            type: 'AOSR',
            number,
            title,
            contractId: params.contractId,
            workRecordId: record.id,
            createdById: session.user.id,
            idCategory: classifyExecutionDoc('AOSR'),
          },
        });

        // Подготовить данные для PDF
        const materials: AosrTemplateData['materials'] = record.writeoffs.map((w) => ({
          name: w.material.name,
          documentType: w.material.documents[0]?.type || 'Паспорт',
          documentNumber: w.material.invoiceNumber || '—',
        }));

        const templateData: AosrTemplateData = {
          number,
          date: new Date().toLocaleDateString('ru-RU'),
          projectName: contract.buildingObject.name,
          projectAddress: contract.buildingObject.address || '',
          contractNumber: contract.number,
          participants,
          workName: record.workItem.name,
          ksiCode: record.workItem.ksiNode?.code ?? '—',
          location: record.location,
          description: record.description || '',
          normative: record.normative || '',
          materials,
          workDate: record.date.toLocaleDateString('ru-RU'),
        };

        // Сгенерировать PDF
        const pdfBuffer = await generateExecutionDocPdf('AOSR', templateData);
        const fileName = `aosr-${number.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
        const s3Key = buildExecutionDocKey(
          session.user.organizationId,
          params.contractId,
          'AOSR',
          fileName
        );
        await uploadFile(pdfBuffer, s3Key, 'application/pdf');

        await db.executionDoc.update({
          where: { id: doc.id },
          data: { s3Key, fileName, generatedAt: new Date() },
        });

        results.push({ workRecordId: record.id, docId: doc.id, success: true });
      } catch (err) {
        logger.error({ err, workRecordId: record.id }, 'Ошибка создания АОСР в пакете');
        results.push({
          workRecordId: record.id,
          docId: '',
          success: false,
          error: 'Внутренняя ошибка',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return successResponse({
      total: workRecords.length,
      created: successCount,
      results,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка пакетного создания АОСР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
