/**
 * Конфигурация статусов и переходов документа ПИР (DesignDocument)
 * Аналог task-state-machine.ts, но для DesignDocStatus (CREATED вместо DRAFT)
 */

import type { DesignDocStatus } from '@prisma/client';

// ─────────────────────────────────────────────
// Конфигурация цветов для точки-индикатора и Badge
// ─────────────────────────────────────────────

export interface DocStatusConfig {
  /** Tailwind-классы для цветной точки */
  dotClass: string;
  /** Читаемый статус на русском */
  label: string;
  /** Классы для Badge-компонента */
  badgeClass: string;
}

export const DOC_STATUS_CONFIG: Record<DesignDocStatus, DocStatusConfig> = {
  CREATED: {
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
    label: 'Аннулирован',
    badgeClass: 'bg-gray-100 text-gray-500',
  },
  REJECTED: {
    dotClass: 'bg-red-500',
    label: 'Отклонён',
    badgeClass: 'bg-red-100 text-red-800',
  },
};

// ─────────────────────────────────────────────
// Доступные действия для каждого статуса
// ─────────────────────────────────────────────

export type DocAction =
  | 'conduct'         // Провести (CREATED → IN_PROGRESS)
  | 'send_review'     // Отправить на проверку (IN_PROGRESS → SENT_FOR_REVIEW)
  | 'approve_review'  // Принять проверку (SENT_FOR_REVIEW → REVIEW_PASSED)
  | 'return'          // Вернуть на доработку (→ WITH_COMMENTS)
  | 'start_approval'  // Запустить согласование (REVIEW_PASSED → IN_APPROVAL)
  | 'cancel';         // Аннулировать

export const DOC_ALLOWED_ACTIONS: Record<DesignDocStatus, DocAction[]> = {
  CREATED:         ['conduct', 'cancel'],
  IN_PROGRESS:     ['send_review', 'cancel'],
  SENT_FOR_REVIEW: ['approve_review', 'return', 'cancel'],
  WITH_COMMENTS:   ['send_review', 'cancel'],
  REVIEW_PASSED:   ['start_approval', 'cancel'],
  IN_APPROVAL:     ['cancel'],
  APPROVED:        [],
  CANCELLED:       [],
  REJECTED:        [],
};

export const DOC_ACTION_LABELS: Record<DocAction, string> = {
  conduct:        'Провести',
  send_review:    'На проверку',
  approve_review: 'Принять проверку',
  return:         'Вернуть на доработку',
  start_approval: 'На согласование',
  cancel:         'Аннулировать',
};

/** Возвращает цветной класс точки с учётом наличия активных замечаний */
export function getDocStatusDotClass(
  status: DesignDocStatus,
  hasActiveComments = false,
  hasAnsweredComments = false,
): string {
  if (status === 'WITH_COMMENTS') {
    if (hasAnsweredComments && !hasActiveComments) return 'bg-orange-500';
    return 'bg-red-500';
  }
  return DOC_STATUS_CONFIG[status].dotClass;
}
