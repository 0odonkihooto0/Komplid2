import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { generateKs11Pdf, generateKs14Pdf } from '@/lib/ks-act-pdf-generator';
import type { Ks11PdfData, Ks14PdfData, KsActParticipant, KsActIndicator, KsActWorkItem, KsActCommissionMember } from '@/lib/ks-act-pdf-generator';
import { uploadFile, buildS3Key, getDownloadUrl } from '@/lib/s3-utils';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; contractId: string; actId: string } };

/** POST — сгенерировать PDF акта КС-11 или КС-14 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const doc = await db.executionDoc.findFirst({
      where: {
        id: params.actId,
        contractId: params.contractId,
        type: { in: ['KS_11', 'KS_14'] },
      },
      include: {
        ksActFormData: true,
        contract: {
          select: {
            number: true,
            buildingObject: { select: { name: true, address: true } },
            participants: {
              include: { organization: { select: { name: true, inn: true } } },
            },
          },
        },
      },
    });
    if (!doc) return errorResponse('Акт не найден', 404);

    const form = doc.ksActFormData;
    const obj = doc.contract.buildingObject;

    // Маппинг участников договора для пп.1-2
    const developer = doc.contract.participants.find((p) => p.role === 'DEVELOPER');
    const contractor = doc.contract.participants.find((p) => p.role === 'CONTRACTOR');

    const ROLE_LABELS: Record<string, string> = {
      DEVELOPER: 'Застройщик (Заказчик)',
      CONTRACTOR: 'Подрядчик',
      SUPERVISION: 'Технический надзор',
      SUBCONTRACTOR: 'Субподрядчик',
    };

    const pdfBase: Ks11PdfData = {
      number: doc.number,
      documentDate: doc.documentDate
        ? doc.documentDate.toLocaleDateString('ru-RU')
        : undefined,
      projectName: obj.name,
      projectAddress: obj.address ?? undefined,
      contractNumber: doc.contract.number,
      developerName: developer?.organization?.name,
      contractorName: contractor?.organization?.name,
      designOrg: form?.designOrg ?? undefined,
      designOrgInn: form?.designOrgInn ?? undefined,
      objectDesc: form?.objectDesc ?? undefined,
      totalArea: form?.totalArea != null ? String(form.totalArea) : undefined,
      buildingVolume: form?.buildingVolume != null ? String(form.buildingVolume) : undefined,
      floorCount: form?.floorCount != null ? String(form.floorCount) : undefined,
      constructionClass: form?.constructionClass ?? undefined,
      startDate: form?.startDate ? form.startDate.toLocaleDateString('ru-RU') : undefined,
      endDate: form?.endDate ? form.endDate.toLocaleDateString('ru-RU') : undefined,
      deviations: form?.deviations ?? undefined,
      constructionCost: form?.constructionCost != null
        ? form.constructionCost.toLocaleString('ru-RU', { minimumFractionDigits: 2 })
        : undefined,
      actualCost: form?.actualCost != null
        ? form.actualCost.toLocaleString('ru-RU', { minimumFractionDigits: 2 })
        : undefined,
      documents: form?.documents ?? undefined,
      conclusion: form?.conclusion ?? undefined,
      participants: Array.isArray(form?.participants)
        ? (form.participants as KsActParticipant[])
        : doc.contract.participants.map((p) => ({
            role: ROLE_LABELS[p.role] ?? p.role,
            orgName: p.organization?.name ?? '',
            inn: p.organization?.inn ?? undefined,
            representative: p.representativeName ?? undefined,
            position: p.position ?? undefined,
            order: p.appointmentOrder ?? undefined,
          })),
      indicators: Array.isArray(form?.indicators)
        ? (form.indicators as KsActIndicator[])
        : [],
      workList: Array.isArray(form?.workList)
        ? (form.workList as KsActWorkItem[])
        : [],
    };

    let pdfBuffer: Buffer;

    if (doc.type === 'KS_14') {
      const ks14Data: Ks14PdfData = {
        ...pdfBase,
        commissionMembers: Array.isArray(form?.commissionMembers)
          ? (form.commissionMembers as KsActCommissionMember[])
          : [],
      };
      pdfBuffer = await generateKs14Pdf(ks14Data);
    } else {
      pdfBuffer = await generateKs11Pdf(pdfBase);
    }

    const prefix = doc.type === 'KS_11' ? 'ks11' : 'ks14';
    const fileName = `${prefix}-${doc.number.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
    const s3Key = buildS3Key(session.user.organizationId, prefix, fileName);
    await uploadFile(pdfBuffer, s3Key, 'application/pdf');

    await db.executionDoc.update({
      where: { id: params.actId },
      data: { s3Key, fileName, generatedAt: new Date() },
    });

    const downloadUrl = await getDownloadUrl(s3Key);

    return successResponse({ s3Key, fileName, downloadUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации PDF КС-11/КС-14');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
