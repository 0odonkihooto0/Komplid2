'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Pencil, Check } from 'lucide-react';
import { KsiTreePicker } from '@/components/modules/ksi/KsiTreePicker';

interface EstimateItem {
  id: string;
  sortOrder: number;
  rawName: string;
  rawUnit: string | null;
  volume: number | null;
  status: string;
  itemType?: string;
  parentItemId?: string | null;
  suggestedKsiNodeId: string | null;
  suggestedKsiNode: { id: string; code: string; name: string } | null;
  normativeRefs?: string[];
  childItems?: EstimateItem[];
}

interface Props {
  items: EstimateItem[];
  isReadOnly: boolean;
  selectedIds: Set<string>;
  applyKsi: boolean;
  onUpdateItem: (itemId: string, data: Record<string, unknown>) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}

export function EstimatePreviewTable({
  items,
  isReadOnly,
  selectedIds,
  applyKsi,
  onUpdateItem,
  onToggleSelect,
  onToggleSelectAll,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleStartEdit = (item: EstimateItem) => {
    setEditingId(item.id);
    setEditName(item.rawName);
  };

  const handleSaveEdit = (itemId: string) => {
    if (editName.trim()) {
      onUpdateItem(itemId, { rawName: editName.trim() });
    }
    setEditingId(null);
  };

  const handleKsiSelect = (itemId: string, ksiNodeId: string | null) => {
    onUpdateItem(itemId, { suggestedKsiNodeId: ksiNodeId });
  };

  const workItems = items.filter((i) => i.itemType !== 'MATERIAL');
  const allWorkSelected =
    workItems.length > 0 && workItems.every((i) => selectedIds.has(i.id));
  const someWorkSelected = workItems.some((i) => selectedIds.has(i.id));

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              {!isReadOnly && (
                <Checkbox
                  checked={allWorkSelected}
                  data-state={someWorkSelected && !allWorkSelected ? 'indeterminate' : undefined}
                  onCheckedChange={onToggleSelectAll}
                  aria-label="Выбрать все работы"
                />
              )}
            </TableHead>
            <TableHead className="w-12">#</TableHead>
            <TableHead className="min-w-[250px]">Наименование</TableHead>
            <TableHead className="w-20">Ед.изм.</TableHead>
            <TableHead className="w-24 text-right">Объём</TableHead>
            <TableHead className="min-w-[160px]">Материалы</TableHead>
            <TableHead className="min-w-[200px]">КСИ</TableHead>
            <TableHead className="min-w-[160px]">Нормативы</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isMaterial = item.itemType === 'MATERIAL';
            const isSkipped = item.status === 'SKIPPED';
            const isSelected = selectedIds.has(item.id);

            return (
              <TableRow
                key={item.id}
                className={isSkipped ? 'opacity-50' : ''}
              >
                {/* Чекбокс — только для WORK строк */}
                <TableCell>
                  {!isReadOnly && !isMaterial && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect(item.id)}
                      aria-label={`Выбрать: ${item.rawName}`}
                    />
                  )}
                </TableCell>

                <TableCell className="text-muted-foreground">{item.sortOrder}</TableCell>

                {/* Наименование — MATERIAL с отступом */}
                <TableCell>
                  <div className={isMaterial ? 'pl-6' : ''}>
                    {editingId === item.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(item.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveEdit(item.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group">
                        <span className={`text-sm ${isSkipped ? 'line-through' : ''} ${isMaterial ? 'text-muted-foreground' : ''}`}>
                          {item.rawName}
                        </span>
                        {!isReadOnly && !isSkipped && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            onClick={() => handleStartEdit(item)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-sm">{item.rawUnit || '—'}</TableCell>
                <TableCell className="text-right text-sm">
                  {item.volume?.toLocaleString('ru-RU') ?? '—'}
                </TableCell>

                {/* Материалы — только для WORK строк */}
                <TableCell>
                  {!isMaterial && item.childItems && item.childItems.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.childItems.map((child) => (
                        <Badge key={child.id} variant="outline" className="text-xs font-normal break-words whitespace-normal">
                          {child.rawName}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* КСИ */}
                <TableCell>
                  {isReadOnly || isSkipped || isMaterial || !applyKsi ? (
                    <span className="text-xs text-muted-foreground">
                      {item.suggestedKsiNode
                        ? `${item.suggestedKsiNode.code} — ${item.suggestedKsiNode.name}`
                        : applyKsi && !isMaterial
                        ? 'Не привязано'
                        : '—'}
                    </span>
                  ) : (
                    <KsiTreePicker
                      value={item.suggestedKsiNodeId ?? undefined}
                      onSelect={(nodeId) => handleKsiSelect(item.id, nodeId)}
                    />
                  )}
                </TableCell>

                {/* Нормативы */}
                <TableCell>
                  {item.itemType !== 'MATERIAL' && item.normativeRefs && item.normativeRefs.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.normativeRefs.map((ref) => (
                        <Badge key={ref} variant="outline" className="text-xs font-normal">
                          {ref}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
