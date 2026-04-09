import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import type { ExecutionDocType, SEDDocType, SpecialJournalType, DesignTaskType } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Метки типов ИД документов
const EXEC_DOC_LABELS: Record<ExecutionDocType, string> = {
  AOSR: 'АОСР',
  OZR: 'ОЖР',
  TECHNICAL_READINESS_ACT: 'Акт технической готовности',
};

// Метки типов СЭД документов
const SED_DOC_LABELS: Record<SEDDocType, string> = {
  LETTER: 'Письмо',
  ORDER: 'Приказ',
  PROTOCOL: 'Протокол',
  ACT: 'Акт',
  MEMO: 'Докладная записка',
  NOTIFICATION: 'Уведомление',
  OTHER: 'Иной документ',
};

// Метки типов специальных журналов
const JOURNAL_TYPE_LABELS: Record<SpecialJournalType, string> = {
  CONCRETE_WORKS: 'Журнал бетонных работ',
  WELDING_WORKS: 'Журнал сварочных работ',
  AUTHOR_SUPERVISION: 'Журнал авторского надзора',
  MOUNTING_WORKS: 'Журнал монтажа конструкций',
  ANTICORROSION: 'Журнал антикоррозионных работ',
  GEODETIC: 'Журнал геодезических работ',
  EARTHWORKS: 'Журнал земляных работ',
  PILE_DRIVING: 'Журнал погружения свай',
  CABLE_LAYING: 'Журнал прокладки кабелей',
  FIRE_SAFETY: 'Журнал инструктажа по ПБ',
  CUSTOM: 'Специальный журнал',
};

// Метки типов заданий ПИР
const DESIGN_TASK_LABELS: Record<DesignTaskType, string> = {
  DESIGN: 'Задание на проектирование',
  SURVEY: 'Задание на изыскания',
};

export interface InboxItem {
  stepId: string;
  type: string;
  typeLabel: string;
  category: string;
  documentName: string;
  objectName: string;
  createdAt: string;
  link: string;
}

export async function GET() {
  try {
    const session = await getSessionOrThrow();
    const userId = session.user.id;

    // Находим все шаги согласования, назначенные текущему пользователю и ожидающие решения
    const pendingSteps = await db.approvalStep.findMany({
      where: {
        userId,
        status: 'WAITING',
      },
      select: {
        id: true,
        stepIndex: true,
        route: {
          select: {
            currentStepIdx: true,
            executionDoc: {
              select: {
                id: true,
                type: true,
                title: true,
                createdAt: true,
                contract: {
                  select: {
                    id: true,
                    buildingObject: { select: { id: true, name: true } },
                  },
                },
              },
            },
            // Ks2Act не имеет ApprovalRoute в текущей схеме — пропускаем
            correspondence: {
              select: {
                id: true,
                subject: true,
                createdAt: true,
                buildingObject: { select: { id: true, name: true } },
              },
            },
            sedDocument: {
              select: {
                id: true,
                title: true,
                docType: true,
                createdAt: true,
                buildingObject: { select: { id: true, name: true } },
              },
            },
            designTask: {
              select: {
                id: true,
                number: true,
                taskType: true,
                createdAt: true,
                buildingObject: { select: { id: true, name: true } },
              },
            },
            pirClosureAct: {
              select: {
                id: true,
                number: true,
                createdAt: true,
                buildingObject: { select: { id: true, name: true } },
              },
            },
            specialJournal: {
              select: {
                id: true,
                title: true,
                type: true,
                createdAt: true,
                project: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    // Оставляем только шаги, являющиеся текущим активным шагом маршрута
    const activeSteps = pendingSteps.filter(
      (step) => step.stepIndex === step.route.currentStepIdx
    );

    // Маппинг шагов в InboxItem
    const items: InboxItem[] = [];

    for (const step of activeSteps) {
      const route = step.route;

      if (route.executionDoc) {
        const doc = route.executionDoc;
        const objectId = doc.contract.buildingObject.id;
        const contractId = doc.contract.id;
        items.push({
          stepId: step.id,
          type: doc.type,
          typeLabel: EXEC_DOC_LABELS[doc.type],
          category: 'ИД',
          documentName: doc.title,
          objectName: doc.contract.buildingObject.name,
          createdAt: doc.createdAt.toISOString(),
          link: `/objects/${objectId}/contracts/${contractId}/docs/${doc.id}`,
        });
        continue;
      }

      if (route.correspondence) {
        const doc = route.correspondence;
        items.push({
          stepId: step.id,
          type: 'CORRESPONDENCE',
          typeLabel: 'Переписка',
          category: 'Переписка',
          documentName: doc.subject,
          objectName: doc.buildingObject.name,
          createdAt: doc.createdAt.toISOString(),
          link: `/objects/${doc.buildingObject.id}/info/correspondence/${doc.id}`,
        });
        continue;
      }

      if (route.sedDocument) {
        const doc = route.sedDocument;
        items.push({
          stepId: step.id,
          type: doc.docType,
          typeLabel: SED_DOC_LABELS[doc.docType],
          category: 'СЭД',
          documentName: doc.title,
          objectName: doc.buildingObject.name,
          createdAt: doc.createdAt.toISOString(),
          link: `/objects/${doc.buildingObject.id}/sed/${doc.id}`,
        });
        continue;
      }

      if (route.designTask) {
        const doc = route.designTask;
        const taskPath = doc.taskType === 'DESIGN' ? 'design-task' : 'survey-task';
        items.push({
          stepId: step.id,
          type: `DESIGN_TASK_${doc.taskType}`,
          typeLabel: DESIGN_TASK_LABELS[doc.taskType],
          category: 'ПИР',
          documentName: doc.number,
          objectName: doc.buildingObject.name,
          createdAt: doc.createdAt.toISOString(),
          link: `/objects/${doc.buildingObject.id}/pir/${taskPath}/${doc.id}`,
        });
        continue;
      }

      if (route.pirClosureAct) {
        const doc = route.pirClosureAct;
        items.push({
          stepId: step.id,
          type: 'PIR_CLOSURE',
          typeLabel: 'Акт сдачи-приёмки ПИР',
          category: 'ПИР',
          documentName: `Акт № ${doc.number}`,
          objectName: doc.buildingObject.name,
          createdAt: doc.createdAt.toISOString(),
          link: `/objects/${doc.buildingObject.id}/pir/closure`,
        });
        continue;
      }

      if (route.specialJournal) {
        const doc = route.specialJournal;
        items.push({
          stepId: step.id,
          type: doc.type,
          typeLabel: JOURNAL_TYPE_LABELS[doc.type],
          category: 'Журналы',
          documentName: doc.title,
          objectName: doc.project.name,
          createdAt: doc.createdAt.toISOString(),
          link: `/objects/${doc.project.id}/journals/${doc.id}`,
        });
        continue;
      }
    }

    return successResponse(items);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения входящих документов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
