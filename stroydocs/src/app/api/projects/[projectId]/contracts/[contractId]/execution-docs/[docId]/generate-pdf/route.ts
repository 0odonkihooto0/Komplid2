import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { uploadFile, getDownloadUrl, buildExecutionDocKey } from '@/lib/s3-utils';
import { generateExecutionDocPdf, renderHtmlToPdf } from '@/lib/pdf-generator';
import { generateDocx } from '@/lib/templates/docxGenerator';
import { convertDocxToPdf } from '@/lib/templates/docxToPdf';
import { formatDate } from '@/utils/format';
import { WORK_RECORD_STATUS_LABELS } from '@/utils/constants';
import type { AosrDocxData, OzrTemplateData, TechReadinessTemplateData } from '@/types/templates';

export const dynamic = 'force-dynamic';

/** Маппинг ролей участников на русский */
const PARTICIPANT_ROLE_LABELS: Record<string, string> = {
  DEVELOPER: 'Застройщик',
  CONTRACTOR: 'Генподрядчик',
  SUBCONTRACTOR: 'Субподрядчик',
  SUPERVISION: 'Авторский надзор',
};

// ── Хелперы для формирования данных AosrDocxData ──────────────────────────────

function formatDateParts(date: Date): { D: string; M: string; Y: string } {
  return {
    D: String(date.getDate()).padStart(2, '0'),
    M: String(date.getMonth() + 1).padStart(2, '0'),
    Y: String(date.getFullYear()),
  };
}

function formatDateRu(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatOrgFull(
  org: { name: string; inn?: string | null; ogrn?: string | null } | null | undefined
): string {
  if (!org) return '—';
  const parts: string[] = [org.name];
  if (org.inn) parts.push(`ИНН ${org.inn}`);
  if (org.ogrn) parts.push(`ОГРН ${org.ogrn}`);
  return parts.join(', ');
}

function formatParticipantFull(
  p: { position?: string | null; representativeName?: string | null; appointmentOrder?: string | null } | null | undefined
): string {
  if (!p) return '—';
  const parts: string[] = [];
  if (p.position) parts.push(p.position);
  parts.push(p.representativeName ?? '—');
  if (p.appointmentOrder) parts.push(`приказ № ${p.appointmentOrder}`);
  return parts.join(', ') || '—';
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; docId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.executionDoc.findFirst({
      where: { id: params.docId, contractId: params.contractId },
      include: {
        contract: {
          include: {
            buildingObject: true,
            participants: {
              include: {
                organization: { select: { name: true, inn: true, ogrn: true } },
              },
            },
          },
        },
        workRecord: {
          include: {
            workItem: {
              select: {
                name: true,
                projectCipher: true,
                ksiNode: { select: { code: true, name: true } },
              },
            },
            writeoffs: {
              include: {
                material: {
                  include: {
                    documents: { take: 1 },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!doc) return errorResponse('Документ не найден', 404);

    const { contract } = doc;
    const today = formatDate(new Date());

    // Подготовка данных участников
    const participants = contract.participants.map((p) => ({
      role: PARTICIPANT_ROLE_LABELS[p.role] || p.role,
      organizationName: p.organization.name,
      representativeName: '—',
      position: '—',
      appointmentOrder: p.appointmentOrder || undefined,
    }));

    // Приоритет 1: overrideHtml — пользователь редактировал текст в TipTap
    if (doc.overrideHtml) {
      const pdfBuffer = await renderHtmlToPdf(doc.overrideHtml);
      const fileName = `${doc.type}_${doc.number}.pdf`;
      const s3Key = buildExecutionDocKey(
        session.user.organizationId,
        params.contractId,
        doc.type,
        fileName
      );
      await uploadFile(pdfBuffer, s3Key, 'application/pdf');
      const updated = await db.executionDoc.update({
        where: { id: params.docId },
        data: { s3Key, fileName, generatedAt: new Date() },
        include: { createdBy: { select: { id: true, firstName: true, lastName: true } }, _count: { select: { signatures: true, comments: true } } },
      });
      const downloadUrl = await getDownloadUrl(s3Key);
      return successResponse({ ...updated, downloadUrl });
    }

    // Вспомогательная функция смёрджить overrideFields поверх данных шаблона
    const applyOverrides = <T>(base: T): T => {
      if (!doc.overrideFields || typeof doc.overrideFields !== 'object') return base;
      return { ...(base as object), ...(doc.overrideFields as object) } as T;
    };

    let pdfBuffer: Buffer;

    if (doc.type === 'AOSR') {
      // Генерация АОСР из aosr.docx (docxtemplater) → LibreOffice → PDF
      const wr = doc.workRecord;
      if (!wr) return errorResponse('Запись о работе не привязана к АОСР', 400);

      const byRole = (role: string) => contract.participants.find((p) => p.role === role);
      const developer     = byRole('DEVELOPER');
      const contractor    = byRole('CONTRACTOR');
      const supervision   = byRole('SUPERVISION');
      const subcontractor = byRole('SUBCONTRACTOR');

      const actDate = wr.date;
      const { D, M, Y }             = formatDateParts(actDate);
      const { D: D1, M: M1, Y: Y1 } = formatDateParts(actDate); // начало работ = дата записи
      const { D: D2, M: M2, Y: Y2 } = formatDateParts(actDate); // окончание работ

      const overrides = (doc.overrideFields as Record<string, string> | null) ?? {};

      const materialsList =
        wr.writeoffs
          .map(({ material }) => {
            const cert = material.documents[0];
            const certRef = cert ? ` (${cert.type}, № ${cert.fileName})` : '';
            return `${material.name}${certRef}`;
          })
          .join(';\n') || '—';

      const aosrData: AosrDocxData = {
        object: `${contract.buildingObject.name}, ${contract.buildingObject.address ?? ''}`.trim().replace(/,\s*$/, ''),
        '№': doc.number?.slice(-6) ?? wr.id.slice(-6),
        date: formatDateRu(actDate),
        D, M, Y, D1, M1, Y1, D2, M2, Y2,

        zakazchik:       formatOrgFull(developer?.organization),
        stroiteli:       formatOrgFull(contractor?.organization),
        projectirovshik: formatOrgFull(supervision?.organization),

        stroiteli11:      formatParticipantFull(contractor),
        stroiteli12:      formatParticipantFull(supervision),
        projectirovshik1: formatParticipantFull(supervision),
        stroiteli3:       formatParticipantFull(subcontractor ?? contractor),

        rabota:     wr.workItem.name,
        project:    wr.workItem.projectCipher ?? '—',
        material:   materialsList,
        shema:      '—',
        ispitaniya: '—',

        SNIP: wr.normative ?? '—',
        Next: overrides.Next ?? '—',
        N:    overrides.N ?? '3',
        DOP:  '—',

        zakazchik2:       developer?.representativeName ?? '—',
        stroiteli21:      contractor?.representativeName ?? '—',
        stroiteli22:      supervision?.representativeName ?? '—',
        projectirovshik2: supervision?.representativeName ?? '—',
        stroiteli32:      subcontractor?.representativeName ?? '—',
      };

      const mergedData = { ...(aosrData as unknown as Record<string, string>), ...overrides };
      const docxBuf = await generateDocx('aosr', mergedData);
      pdfBuffer = await convertDocxToPdf(docxBuf);
    } else if (doc.type === 'OZR') {
      // Данные для ОЖР — все записи о работах по договору
      const records = await db.workRecord.findMany({
        where: { contractId: params.contractId },
        include: { workItem: { select: { name: true } } },
        orderBy: { date: 'asc' },
      });

      const data: OzrTemplateData = {
        number: doc.number,
        date: today,
        projectName: contract.buildingObject.name,
        projectAddress: contract.buildingObject.address || '—',
        contractNumber: contract.number,
        participants,
        records: records.map((r) => ({
          date: formatDate(r.date),
          workName: r.workItem.name,
          location: r.location,
          normative: r.normative || '—',
          status: WORK_RECORD_STATUS_LABELS[r.status],
        })),
      };

      pdfBuffer = await generateExecutionDocPdf('OZR', applyOverrides(data));
    } else {
      // Акт технической готовности — все виды работ по договору
      const workItems = await db.workItem.findMany({
        where: { contractId: params.contractId },
        select: { name: true, projectCipher: true },
      });

      const data: TechReadinessTemplateData = {
        number: doc.number,
        date: today,
        projectName: contract.buildingObject.name,
        projectAddress: contract.buildingObject.address || '—',
        contractNumber: contract.number,
        participants,
        works: workItems.map((wi) => ({
          name: wi.name,
          cipher: wi.projectCipher,
          status: 'Выполнено',
        })),
      };

      pdfBuffer = await generateExecutionDocPdf('TECHNICAL_READINESS_ACT', applyOverrides(data));
    }

    // Загрузка PDF в S3
    const fileName = `${doc.type}_${doc.number}.pdf`;
    const s3Key = buildExecutionDocKey(
      session.user.organizationId,
      params.contractId,
      doc.type,
      fileName
    );

    await uploadFile(pdfBuffer, s3Key, 'application/pdf');

    // Обновление записи
    const updated = await db.executionDoc.update({
      where: { id: params.docId },
      data: {
        s3Key,
        fileName,
        generatedAt: new Date(),
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { signatures: true, comments: true } },
      },
    });

    const downloadUrl = await getDownloadUrl(s3Key);

    return successResponse({ ...updated, downloadUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({
      err: error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      docId: params.docId,
      contractId: params.contractId,
    }, 'Ошибка генерации PDF');
    return errorResponse(
      `Ошибка генерации PDF: ${error instanceof Error ? error.message : 'Внутренняя ошибка'}`,
      500
    );
  }
}
