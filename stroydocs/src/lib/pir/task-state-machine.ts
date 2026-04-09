/**
 * Конфигурация статусов и переходов задания на ПИР
 * Используется для цветовых индикаторов и кнопок действий
 */

import type { DesignTaskStatus } from '@prisma/client';

// ─────────────────────────────────────────────
// Конфигурация цветов для точки-индикатора
// ─────────────────────────────────────────────

export interface TaskStatusConfig {
  /** Tailwind-классы для цветной точки */
  dotClass: string;
  /** Читаемый статус на русском */
  label: string;
  /** Классы для Badge-компонента */
  badgeClass: string;
}

export const TASK_STATUS_CONFIG: Record<DesignTaskStatus, TaskStatusConfig> = {
  DRAFT: {
    dotClass: 'bg-gray-400',
    label: 'Создан',
    badgeClass: 'bg-gray-100 text-gray-700',
  },
  IN_PROGRESS: {
    dotClass: 'bg-blue-500',
    label: 'В работе',
    badgeClass: 'bg-blue-100 text-blue-800',
  },
  SENT_FOR_REVIEW: {
    dotClass: 'bg-blue-500',
    label: 'На проверке',
    badgeClass: 'bg-blue-100 text-blue-800',
  },
  WITH_COMMENTS: {
    // Цвет зависит от наличия активных замечаний — красный или оранжевый.
    // Компонент использует hasActiveComments для выбора между ними.
    dotClass: 'bg-red-500',
    label: 'С замечаниями',
    badgeClass: 'bg-red-100 text-red-800',
  },
  REVIEW_PASSED: {
    dotClass: 'bg-green-500',
    label: 'Проверка пройдена',
    badgeClass: 'bg-green-100 text-green-800',
  },
  IN_APPROVAL: {
    dotClass: 'bg-green-500',
    label: 'На согласовании',
    badgeClass: 'bg-green-100 text-green-800',
  },
  APPROVED: {
    dotClass: 'bg-green-600',
    label: 'Согласовано',
    badgeClass: 'bg-green-100 text-green-800',
  },
  CANCELLED: {
    dotClass: 'bg-gray-300',
    label: 'Аннулировано',
    badgeClass: 'bg-gray-100 text-gray-500',
  },
};

// ─────────────────────────────────────────────
// Доступные действия для каждого статуса
// ─────────────────────────────────────────────

export type TaskAction =
  | 'conduct'       // Провести (DRAFT → IN_PROGRESS)
  | 'send_review'   // Отправить на проверку (IN_PROGRESS → SENT_FOR_REVIEW)
  | 'approve_review' // Принять проверку (SENT_FOR_REVIEW → REVIEW_PASSED)
  | 'return'        // Вернуть на доработку (любой → WITH_COMMENTS)
  | 'start_approval' // Запустить согласование (REVIEW_PASSED → IN_APPROVAL)
  | 'cancel';       // Аннулировать

export const ALLOWED_ACTIONS: Record<DesignTaskStatus, TaskAction[]> = {
  DRAFT:           ['conduct', 'cancel'],
  IN_PROGRESS:     ['send_review', 'cancel'],
  SENT_FOR_REVIEW: ['approve_review', 'return', 'cancel'],
  WITH_COMMENTS:   ['send_review', 'cancel'],
  REVIEW_PASSED:   ['start_approval', 'cancel'],
  IN_APPROVAL:     ['cancel'],
  APPROVED:        [],
  CANCELLED:       [],
};

export const ACTION_LABELS: Record<TaskAction, string> = {
  conduct:        'Провести',
  send_review:    'Отправить на проверку',
  approve_review: 'Принять проверку',
  return:         'Вернуть на доработку',
  start_approval: 'Запустить согласование',
  cancel:         'Аннулировать',
};

/** Возвращает цветной класс точки с учётом наличия активных замечаний */
export function getStatusDotClass(status: DesignTaskStatus, hasActiveComments = false, hasAnsweredComments = false): string {
  if (status === 'WITH_COMMENTS') {
    if (hasAnsweredComments && !hasActiveComments) return 'bg-orange-500';
    return 'bg-red-500';
  }
  return TASK_STATUS_CONFIG[status].dotClass;
}
