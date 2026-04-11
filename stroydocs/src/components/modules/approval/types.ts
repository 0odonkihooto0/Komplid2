// Общие типы для модуля согласования ПИР
// Заменяют дублирующиеся интерфейсы из PIRApprovalSection, useDesignDocDetail, usePIRClosureDetail

export type ApprovalRouteStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESET';
export type ApprovalStepStatus = 'WAITING' | 'APPROVED' | 'REJECTED';

export interface ApprovalStepUser {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ApprovalStep {
  id: string;
  stepIndex: number;
  role: string;
  status: ApprovalStepStatus;
  comment: string | null;
  decidedAt: string | null;
  userId: string | null;
  user: ApprovalStepUser | null;
}

export interface ApprovalRoute {
  id: string;
  status: ApprovalRouteStatus;
  currentStepIdx: number;
  steps: ApprovalStep[];
}

// Тип сущности ПИР для шаблонов согласования
export type PIREntityType = 'DESIGN_TASK_PIR' | 'DESIGN_TASK_SURVEY' | 'DESIGN_DOC' | 'PIR_CLOSURE';

export interface ApprovalTemplateLevel {
  id: string;
  level: number;
  userId: string;
  requiresPreviousApproval: boolean;
  user: ApprovalStepUser | null;
}

export interface ApprovalTemplate {
  id: string;
  name: string;
  description: string | null;
  entityType: PIREntityType;
  levels: ApprovalTemplateLevel[];
  createdAt: string;
}

// Конфигурация статусов шагов для визуализации
export const STEP_STATUS_CONFIG: Record<ApprovalStepStatus, { dotClass: string; label: string }> = {
  WAITING:  { dotClass: 'bg-yellow-400 border-yellow-500', label: 'Ожидает' },
  APPROVED: { dotClass: 'bg-green-500 border-green-600',  label: 'Согласовано' },
  REJECTED: { dotClass: 'bg-red-500 border-red-600',      label: 'Отклонено' },
};

// Метки ролей участников
export const ROLE_LABELS: Record<string, string> = {
  DEVELOPER:     'Застройщик',
  CONTRACTOR:    'Подрядчик',
  SUPERVISION:   'Стройконтроль',
  SUBCONTRACTOR: 'Субподрядчик',
};
