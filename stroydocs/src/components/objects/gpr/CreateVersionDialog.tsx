'use client';

import { GanttVersionEditDialog } from './GanttVersionEditDialog';
import type { GanttStageItem } from './useGanttStructure';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectId: string;
  stages: GanttStageItem[];
  selectedStageId: string | null;
  // Оставлены для обратной совместимости; логика создания теперь в GanttVersionEditDialog
  isCreating: boolean;
  onCreate: (name: string) => void;
}

// CreateVersionDialog — тонкая обёртка над GanttVersionEditDialog в режиме создания.
export function CreateVersionDialog({ open, onOpenChange, objectId, selectedStageId }: Props) {
  return (
    <GanttVersionEditDialog
      open={open}
      onOpenChange={onOpenChange}
      objectId={objectId}
      version={null}
      defaultStageId={selectedStageId}
    />
  );
}
