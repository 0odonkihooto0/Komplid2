import type { UserRole } from '@prisma/client';
import { ROLE_LABELS } from './constants';

/** Формирование полного ФИО */
export function formatFullName(user: {
  lastName: string;
  firstName: string;
  middleName?: string | null;
}) {
  const parts = [user.lastName, user.firstName];
  if (user.middleName) parts.push(user.middleName);
  return parts.join(' ');
}

/** Форматирование даты в русской локали */
export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Форматирование даты и времени в русской локали (с часами и минутами) */
export function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Форматирование ИНН (с пробелами для читаемости) */
export function formatInn(inn: string) {
  return inn;
}

/** Получить русское название роли */
export function formatRole(role: UserRole) {
  return ROLE_LABELS[role] || role;
}

/** Форматирование размера файла в читаемый вид */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Б';
  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Форматирование числа для счётчиков: 1200 → "1.2k", 1500000 → "1.5M" */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/** Форматирование суммы в рублях */
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}
