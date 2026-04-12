'use client';

import { MoreHorizontal, Plus, Info, Pencil, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdditionalCosts, COST_TYPE_LABELS } from './useAdditionalCosts';
import { AddAdditionalCostDialog } from './AddAdditionalCostDialog';
import type { AdditionalCostItem } from './useAdditionalCosts';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectId: string;
}

/** Диалог "Общие доп. затраты для объекта" */
export function AdditionalCostsDialog({ open, onOpenChange, objectId }: Props) {
  const {
    costs,
    isLoading,
    addDialogOpen,
    setAddDialogOpen,
    editingCost,
    setEditingCost,
    createCost,
    updateCost,
    deleteCost,
  } = useAdditionalCosts(objectId);

  const handleDelete = (cost: AdditionalCostItem) => {
    if (confirm(`Удалить «${cost.name}»?`)) {
      deleteCost.mutate(cost.id);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Общие доп. затраты для объекта</DialogTitle>
          </DialogHeader>

          <div className="flex justify-end">
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Добавить затраты
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-5/6" />
            </div>
          ) : costs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Нет дополнительных затрат
            </p>
          ) : (
            <CostsTable
              costs={costs}
              onInfo={setEditingCost}
              onEdit={setEditingCost}
              onDelete={handleDelete}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог создания/редактирования ДЗ */}
      <AddAdditionalCostDialog
        open={addDialogOpen || !!editingCost}
        onOpenChange={(v) => {
          if (!v) { setAddDialogOpen(false); setEditingCost(null); }
        }}
        editingCost={editingCost}
        onSubmitCreate={(data) => createCost.mutate(data)}
        onSubmitUpdate={(costId, data) => updateCost.mutate({ costId, data })}
        isPending={createCost.isPending || updateCost.isPending}
        objectId={objectId}
      />
    </>
  );
}

// ─── Таблица ДЗ ────────────────────────────────────────────────────────────

function CostsTable({
  costs,
  onInfo,
  onEdit,
  onDelete,
}: {
  costs: AdditionalCostItem[];
  onInfo: (c: AdditionalCostItem) => void;
  onEdit: (c: AdditionalCostItem) => void;
  onDelete: (c: AdditionalCostItem) => void;
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">Сметы</TableHead>
            <TableHead>Наименование</TableHead>
            <TableHead className="w-[90px]">Значение</TableHead>
            <TableHead className="w-[70px]">СР</TableHead>
            <TableHead className="w-[70px]">МР</TableHead>
            <TableHead className="w-[90px]">Оборуд.</TableHead>
            <TableHead className="w-[70px]">Прочее</TableHead>
            <TableHead className="w-[70px]">Уровень</TableHead>
            <TableHead className="w-[120px]">Главы</TableHead>
            <TableHead className="w-[150px]">Справочник</TableHead>
            <TableHead className="w-[40px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {costs.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="text-xs truncate max-w-[140px]">
                {c.estimateLinks.map((l) => l.version.name).join(', ') || '—'}
              </TableCell>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell className="text-xs">{c.value ?? '—'}</TableCell>
              <TableCell className="text-xs">{c.constructionWorks ?? '—'}</TableCell>
              <TableCell className="text-xs">{c.mountingWorks ?? '—'}</TableCell>
              <TableCell className="text-xs">{c.equipment ?? '—'}</TableCell>
              <TableCell className="text-xs">{c.other ?? '—'}</TableCell>
              <TableCell className="text-center">{c.level}</TableCell>
              <TableCell className="text-xs truncate max-w-[120px]">
                {c.chapterLinks.map((l) => l.chapterName).join(', ') || '—'}
              </TableCell>
              <TableCell className="text-xs">
                {COST_TYPE_LABELS[c.costType] ?? c.costType}
              </TableCell>
              <TableCell>
                <RowActions cost={c} onInfo={onInfo} onEdit={onEdit} onDelete={onDelete} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Меню действий строки ──────────────────────────────────────────────────

function RowActions({
  cost,
  onInfo,
  onEdit,
  onDelete,
}: {
  cost: AdditionalCostItem;
  onInfo: (c: AdditionalCostItem) => void;
  onEdit: (c: AdditionalCostItem) => void;
  onDelete: (c: AdditionalCostItem) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onInfo(cost)}>
          <Info className="mr-2 h-4 w-4" /> Информация
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(cost)}>
          <Pencil className="mr-2 h-4 w-4" /> Редактировать
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(cost)}>
          <Trash2 className="mr-2 h-4 w-4" /> Удалить
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
