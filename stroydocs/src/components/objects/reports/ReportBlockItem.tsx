'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit2, Trash2, X, Check, Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BlockContentRenderer } from './BlockContentRenderer';
import { BlockAutoFill } from './BlockAutoFill';
import { BLOCK_TYPE_LABELS } from './AddBlockDialog';
import type { ReportBlock, UpdateBlockPayload } from './useReportCard';

interface Props {
  objectId: string;
  reportId: string;
  block: ReportBlock;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (payload: UpdateBlockPayload) => void;
  onDelete: (blockId: string) => void;
  onFilled: () => void;
}

export function ReportBlockItem({
  objectId,
  reportId,
  block,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  onFilled,
}: Props) {
  const [editTitle, setEditTitle] = useState(block.title);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle.trim() !== block.title) {
      onUpdate({ blockId: block.id, title: editTitle.trim() });
    } else {
      onCancelEdit();
    }
  };

  const handleClear = () => {
    onUpdate({ blockId: block.id, content: null });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border bg-card"
    >
      {/* ─── Шапка блока ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 rounded-t-lg">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground"
          aria-label="Перетащить"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Номер + тип */}
        <span className="text-xs text-muted-foreground w-6 shrink-0">{block.order + 1}</span>
        <Badge variant="outline" className="text-xs shrink-0">
          {BLOCK_TYPE_LABELS[block.type] ?? block.type}
        </Badge>

        {/* Заголовок или форма редактирования */}
        {isEditing ? (
          <div className="flex flex-1 items-center gap-1">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="h-7 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle();
                if (e.key === 'Escape') onCancelEdit();
              }}
              autoFocus
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveTitle}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCancelEdit}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <span className="flex-1 text-sm font-medium truncate">{block.title}</span>
        )}

        {/* Кнопки действий */}
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <BlockAutoFill
              objectId={objectId}
              reportId={reportId}
              blockId={block.id}
              blockType={block.type}
              onFilled={onFilled}
            />
            <Button variant="ghost" size="sm" onClick={onEdit} title="Редактировать заголовок">
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              title="Очистить содержимое"
              disabled={!block.content}
            >
              <Eraser className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(block.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* ─── Содержимое блока ────────────────────────────────────────────────── */}
      <div className="px-4 py-3">
        <BlockContentRenderer type={block.type} content={block.content} />
      </div>
    </div>
  );
}
