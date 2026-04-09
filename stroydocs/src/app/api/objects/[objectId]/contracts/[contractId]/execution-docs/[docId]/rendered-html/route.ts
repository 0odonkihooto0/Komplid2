/**
 * GET /api/objects/[objectId]/contracts/[contractId]/execution-docs/[docId]/rendered-html
 *
 * Возвращает HTML-контент исполнительного документа для загрузки в TipTap-редактор.
 * Если overrideHtml задан — возвращает его; иначе рендерит Handlebars-шаблон с данными.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse, successResponse } from '@/utils/api';
import { renderExecutionDocHtml } from '@/lib/pdf-generator';
import { formatDate } from '@/utils/format';
import { WORK_RECORD_STATUS_LABELS, MATERIAL_DOC_TYPE_LABELS } from '@/utils/constants';
import type { AosrTemplateData, OzrTemplateData, TechReadinessTemplateData } from '@/types/templates';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const PARTICIPANT_ROLE_LABELS: Record<string, string> = {
  DEVELOPER: 'Застройщик',
  CONTRACTOR: 'Генподрядчик',
  SUBCONTRACTOR: 'Субподрядчик',
  SUPERVISION: 'Авторский надзор',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; docId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.executionDoc.findFirst({
      where: { id: params.docId, contractId: params.contractId },
      include: {
        contract: {
          include: {
            buildingObject: true,
            participants: { include: { organization: { select: { name: true } } } },
          },
        },
        workRecord: {
          include: {
            workItem: { select: { name: true, projectCipher: true, ksiNode: { select: { code: true, name: true } } } },
            writeoffs: { include: { material: { include: { documents: { take: 1 } } } } },
          },
        },
      },
    });

    if (!doc) return errorResponse('Документ не найден', 404);

    // Приоритет 1: уже отредактированный HTML из TipTap
    if (doc.overrideHtml) {
      return successResponse({ html: doc.overrideHtml });
    }

    const { contract } = doc;
    const today = formatDate(new Date());

    const participants = contract.participants.map((p) => ({
      role: PARTICIPANT_ROLE_LABELS[p.role] || p.role,
      organizationName: p.organization.name,
      representativeName: '—',
      position: '—',
      appointmentOrder: p.appointmentOrder || undefined,
    }));

    // Приоритет 2: собрать базовые данные из БД, смёрджить с overrideFields
    const applyOverrides = <T>(base: T): T => {
      if (!doc.overrideFields || typeof doc.overrideFields !== 'object') return base;
      return { ...(base as object), ...(doc.overrideFields as object) } as T;
    };

    let html: string;

    if (doc.type === 'AOSR') {
      const wr = doc.workRecord;
      if (!wr) return errorResponse('Запись о работе не привязана к АОСР', 400);

      const data: AosrTemplateData = {
        number: doc.number,
        date: today,
        projectName: contract.buildingObject.name,
        projectAddress: contract.buildingObject.address || '—',
        contractNumber: contract.number,
        participants,
        workName: wr.workItem.name,
        ksiCode: wr.workItem.ksiNode?.code ?? '—',
        location: wr.location,
        description: wr.description || '',
        normative: wr.normative || '—',
        materials: wr.writeoffs.map((w) => ({
          name: w.material.name,
          documentType: w.material.documents[0]
            ? MATERIAL_DOC_TYPE_LABELS[w.material.documents[0].type]
            : '—',
          documentNumber: w.material.documents[0]?.fileName || '—',
        })),
        workDate: formatDate(wr.date),
      };
      html = renderExecutionDocHtml('AOSR', applyOverrides(data));
    } else if (doc.type === 'OZR') {
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
      html = renderExecutionDocHtml('OZR', applyOverrides(data));
    } else {
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
        works: workItems.map((wi) => ({ name: wi.name, cipher: wi.projectCipher, status: 'Выполнено' })),
      };
      html = renderExecutionDocHtml('TECHNICAL_READINESS_ACT', applyOverrides(data));
    }

    return successResponse({ html });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения HTML документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
