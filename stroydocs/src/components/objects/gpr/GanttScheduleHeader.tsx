'use client';

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { GanttVersionSummary } from './useGanttStructure';

interface Props {
  version: GanttVersionSummary | null;
  onEditVersion: () => void;
}

// Варианты Badge из badge.tsx (default | secondary | destructive | outline | success | warning)
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

// Определяем вариант Badge по флагам версии
function getVersionBadge(version: GanttVersionSummary): { label: string; variant: BadgeVariant } {
  if (version.isDirective) return { label: 'Директивная', variant: 'warning' };
  if (version.isActive) return { label: 'Актуальная', variant: 'success' };
  if (version.isBaseline) return { label: 'Базовая', variant: 'secondary' };
  return { label: 'Архив', variant: 'secondary' };
}

export function GanttScheduleHeader({ version, onEditVersion }: Props) {
  if (!version) {
    return (
      <div className="flex items-center gap-2 min-h-8">
        <span className="text-sm text-muted-foreground">Выберите версию ГПР</span>
      </div>
    );
  }

  const badge = getVersionBadge(version);

  return (
    <div className="flex items-center gap-2 min-h-8">
      <h2 className="text-base font-semibold truncate max-w-sm">{version.name}</h2>
      <Badge variant={badge.variant} className="text-[10px] shrink-0">
        {badge.label}
      </Badge>
      {version.progress > 0 && (
        <span className="text-xs text-muted-foreground shrink-0">{version.progress}%</span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={onEditVersion}
        aria-label="Редактировать версию"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
