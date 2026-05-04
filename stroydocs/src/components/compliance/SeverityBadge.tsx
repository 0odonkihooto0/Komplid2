'use client';

import { Badge } from '@/components/ui/badge';
import type { IssueSeverity } from '@prisma/client';

const SEVERITY_CONFIG: Record<IssueSeverity, { label: string; className: string }> = {
  CRITICAL: { label: 'Критично', className: 'bg-red-100 text-red-800 border-red-200' },
  HIGH: { label: 'Высокий', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  MEDIUM: { label: 'Средний', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  LOW: { label: 'Низкий', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  INFO: { label: 'Инфо', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

interface SeverityBadgeProps {
  severity: IssueSeverity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
