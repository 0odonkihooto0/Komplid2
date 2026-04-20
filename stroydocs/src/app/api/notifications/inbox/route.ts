import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import type {
  ExecutionDocType,
  SEDDocType,
  SpecialJournalType,
  DesignTaskType,
  ParticipantRole,
  ApprovalStepStatus,
} from '@prisma/client';

export const dynamic = 'force-dynamic';

const EXEC_DOC_LABELS: Record<ExecutionDocType, string> = {
  AOSR: 'АОСР',
  OZR: 'ОЖР',
  TECHNICAL_READINESS_ACT: 'Акт технической готовности',
  GENERAL_DOCUMENT: 'Общий документ',
  KS_6A: 'КС-6а',
  KS_11: 'КС-11',
  KS_14: 'КС-14',
};

const SED_DOC_LABELS: Record<SEDDocType, string> = {
  LETTER: 'Письмо',
  ORDER: 'Приказ',
  PROTOCOL: 'Протокол',
  ACT: 'Акт',
  MEMO: 'Докладная записка',
  NOTIFICATION: 'Уведомление',
  OTHER: 'Иной документ',
};

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
  OZR_1026PR: 'Общий журнал работ (1026/пр)',
  OZR_RD_11_05: 'Общий журнал работ (РД 11-05)',
  INPUT_CONTROL: 'Журнал входного контроля',
  CONSTRUCTION_CONTROL: 'Журнал строительного контроля',
  CONSTRUCTION_CONTROL_V2: 'Журнал строительного контроля v.2',
  SK_CALL_REGISTER: 'Журнал вызовов представителей СК',
  AUTHOR_SUPERVISION_2016: 'Журнал авторского надзора (2016)',
  DRILLING_WORKS: 'Журнал буровых работ',
  CONCRETE_CURING: 'Журнал ухода за бетоном',
  JOINT_GROUTING: 'Журнал замоноличивания стыков',
  ANTICORROSION_WELD: 'Журнал антикоррозионной защиты сварных соединений',
  BOLT_CONNECTIONS: 'Журнал монтажных соединений на болтах',
  TORQUE_WRENCH_CALIBRATION: 'Журнал тарировки динамометрических ключей',
  CABLE_TUBE: 'Кабельнотрубный журнал',
  CABLE_ROUTE: 'Кабельный журнал (по трассам)',
  PIPELINE_WELDING: 'Журнал сварки трубопроводов',
  INSULATION_LAYING: 'Журнал изоляционно-укладочных работ',
  TECHNICAL_LEVELING: 'Журнал технического нивелирования',
  FIRE_SAFETY_INTRO: 'Журнал вводного инструктажа по ПБ',
  GENERAL_INTRO_BRIEFING: 'Журнал вводного инструктажа',
  CUSTOM: 'Специальный журнал',
};

const DESIGN_TASK_LABELS: Record<DesignTaskType, string> = {
  DESIGN: 'Задание на проектирование',
  SURVEY: 'Задание на изыскания',
};

// Метки ролей участников согласования
const ROLE_LABELS: Record<ParticipantRole, string> = {
  DEVELOPER: 'Застройщик',
  CONTRACTOR: 'Подрядчик',
  SUPERVISION: 'Технадзор',
  SUBCONTRACTOR: 'Субподрядчик',
};

export interface RouteStep {
  label: string;
  sub: string;
  state: 'done' | 'cur' | 'wait';
}

export interface InboxStat {
  key: string;
  value: string;
}

export interface InboxItemWithRoute {
  stepId: string;
  type: string;
  typeLabel: string;
  category: string;
  documentName: string;
  objectName: string;
  createdAt: string;
  link: string;
  routeSteps: RouteStep[];
  stats: InboxStat[];
  deadline: string | null;
  urgent: boolean;
}

function mapStep(
  step: { stepIndex: number; role: ParticipantRole; status: ApprovalStepStatus; user: { firstName: string; lastName: string } | null },
  currentStepIdx: number
): RouteStep {
  const roleLabel = ROLE_LABELS[step.role] ?? String(step.role);

  if (step.status === 'APPROVED') {
    const name = step.user
      ? `${step.user.lastName} ${step.user.firstName[0]}.`
      : '';
    return { label: roleLabel, sub: name ? `${name} · подписал` : 'подписал', state: 'done' };
  }

  if (step.status === 'REJECTED') {
    const name = step.user
      ? `${step.user.lastName} ${step.user.firstName[0]}.`
      : '';
    return { label: roleLabel, sub: name ? `${name} · отклонил` : 'отклонил', state: 'done' };
  }

  if (step.stepIndex === currentStepIdx) {
    return { label: roleLabel, sub: 'ожидает подписи', state: 'cur' };
  }

  return { label: roleLabel, sub: roleLabel, state: 'wait' };
}

export async function GET() {
  try {
    const session = await getSessionOrThrow();
    const userId = session.user.id;

    const pendingSteps = await db.approvalStep.findMany({
      where: { userId, status: 'WAITING' },
      select: {
        id: true,
        stepIndex: true,
        route: {
          select: {
            currentStepIdx: true,
            // Все шаги маршрута для правой панели
            steps: {
              orderBy: { stepIndex: 'asc' },
              select: {
                stepIndex: true,
                role: true,
                status: true,
                user: { select: { firstName: true, lastName: true } },
              },
            },
            executionDoc: {
              select: {
                id: true,
                type: true,
                title: true,
                createdAt: true,
                contract: {
                  select: {
                    id: true,
                    number: true,
                    buildingObject: { select: { id: true, name: true } },
                  },
                },
              },
            },
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

    const items: InboxItemWithRoute[] = [];

    for (const step of activeSteps) {
      const route = step.route;
      const routeSteps = route.steps.map((s) => mapStep(s, route.currentStepIdx));

      if (route.executionDoc) {
        const doc = route.executionDoc;
        const objectId = doc.contract.buildingObject.id;
        items.push({
          stepId: step.id,
          type: doc.type,
          typeLabel: EXEC_DOC_LABELS[doc.type],
          category: 'ИД',
          documentName: doc.title,
          objectName: doc.contract.buildingObject.name,
          createdAt: doc.createdAt.toISOString(),
          link: `/objects/${objectId}/contracts/${doc.contract.id}/docs/${doc.id}`,
          routeSteps,
          stats: [
            { key: 'Тип документа', value: EXEC_DOC_LABELS[doc.type] },
            { key: 'Объект', value: doc.contract.buildingObject.name },
            { key: 'Договор', value: doc.contract.number },
            { key: 'Статус', value: 'На согласовании' },
          ],
          deadline: null,
          urgent: false,
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
          routeSteps,
          stats: [
            { key: 'Тип', value: 'Переписка' },
            { key: 'Объект', value: doc.buildingObject.name },
            { key: 'Статус', value: 'На согласовании' },
          ],
          deadline: null,
          urgent: false,
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
          routeSteps,
          stats: [
            { key: 'Тип', value: SED_DOC_LABELS[doc.docType] },
            { key: 'Объект', value: doc.buildingObject.name },
            { key: 'Статус', value: 'На согласовании' },
          ],
          deadline: null,
          urgent: false,
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
          routeSteps,
          stats: [
            { key: 'Тип', value: DESIGN_TASK_LABELS[doc.taskType] },
            { key: 'Объект', value: doc.buildingObject.name },
            { key: 'Статус', value: 'На проверке' },
          ],
          deadline: null,
          urgent: false,
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
          routeSteps,
          stats: [
            { key: 'Тип', value: 'Акт сдачи-приёмки ПИР' },
            { key: 'Объект', value: doc.buildingObject.name },
            { key: 'Статус', value: 'На приёмке' },
          ],
          deadline: null,
          urgent: false,
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
          routeSteps,
          stats: [
            { key: 'Тип', value: JOURNAL_TYPE_LABELS[doc.type] },
            { key: 'Объект', value: doc.project.name },
            { key: 'Статус', value: 'На согласовании' },
          ],
          deadline: null,
          urgent: false,
        });
        continue;
      }
    }

    return successResponse(items);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения входящих для страницы уведомлений');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
