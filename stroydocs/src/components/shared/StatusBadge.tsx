import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  // Проекты
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  ARCHIVED: 'bg-gray-100 text-gray-600',
  // Договоры
  DRAFT: 'bg-gray-100 text-gray-800',
  TERMINATED: 'bg-red-100 text-red-800',
  // Записи о работах
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  REJECTED: 'bg-red-100 text-red-800',
  // Общие
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-red-100 text-red-800',
  // Исполнительная документация
  IN_REVIEW: 'bg-yellow-100 text-yellow-800',
  SIGNED: 'bg-green-100 text-green-800',
  // Замечания
  OPEN: 'bg-orange-100 text-orange-800',
  RESOLVED: 'bg-green-100 text-green-800',
  // Входной контроль
  CONFORMING: 'bg-green-100 text-green-800',
  NON_CONFORMING: 'bg-red-100 text-red-800',
  CONDITIONAL: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  // Категории фото
  CONFIRMING: 'bg-blue-100 text-blue-800',
  VIOLATION: 'bg-red-100 text-red-800',
};

interface StatusBadgeProps {
  status: string;
  label: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        statusStyles[status] || 'bg-gray-100 text-gray-800',
        className
      )}
    >
      {label}
    </span>
  );
}
