/**
 * Конфигурация статусов и переходов акта закрытия ПИР
 */

import type { PIRClosureStatus } from '@prisma/client';

// ─────────────────────────────────────────────
// Конфигурация цветов и меток статуса
// ─────────────────────────────────────────────

export interface ClosureStatusConfig {
  /** Tailwind-классы для цветной точки-индикатора */
  dotClass: string;
  /** Читаемый статус на русском */
  label: string;
  /** Классы для Badge-компонента */
  badgeClass: string;
}

export const CLOSURE_STATUS_CONFIG: Record<PIRClosureStatus, ClosureStatusConfig> = {
  DRAFT: {
    dotClass: 'bg-gray-400',
    label: 'Черновик',
    badgeClass: 'bg-gray-100 text-gray-700',
  },
  CONDUCTED: {
    dotClass: 'bg-blue-500',
    label: 'Проведён',
    badgeClass: 'bg-blue-100 text-blue-800',
  },
  IN_APPROVAL: {
    dotClass: 'bg-green-500',
    label: 'На согласовании',
    badgeClass: 'bg-green-100 text-green-800',
  },
  SIGNED: {
    dotClass: 'bg-green-700',
    label: 'Подписан',
    badgeClass: 'bg-green-200 text-green-900',
  },
};

// ─────────────────────────────────────────────
// Доступные действия для каждого статуса
// ─────────────────────────────────────────────

export type ClosureAction =
  | 'conduct'        // Провести (DRAFT → CONDUCTED)
  | 'start_approval' // Запустить согласование (CONDUCTED → IN_APPROVAL)
  | 'sign';          // Подписать (IN_APPROVAL → SIGNED, выполняется через ApprovalRoute)

export const CLOSURE_ALLOWED_ACTIONS: Record<PIRClosureStatus, ClosureAction[]> = {
  DRAFT:       ['conduct'],
  CONDUCTED:   ['start_approval'],
  IN_APPROVAL: [],
  SIGNED:      [],
};

export const CLOSURE_ACTION_LABELS: Record<ClosureAction, string> = {
  conduct:        'Провести',
  start_approval: 'Запустить согласование',
  sign:           'Подписать',
};
