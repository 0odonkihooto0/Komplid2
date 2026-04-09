'use client';

import { useState } from 'react';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  useGanttDailyPlans,
  useUpdateDailyPlan,
  useDeleteDailyPlan,
  type GanttDailyPlanItem,
} from './useGanttDailyPlans';
import { GanttAddDailyPlanDialog } from './GanttAddDailyPlanDialog';
import { useCreateDailyPlan } from './useGanttDailyPlans';

interface Props {
  objectId: string;
  versionId: string;
  date: string;
}

// ── Inline-редактируемая ячейка ───────────────────────────────────────────────

interface EditCellProps {
  value: string;
  type?: 'text' | 'number';
  placeholder?: string;
  onSave: (value: string) => void;
}

function EditCell({ value, type = 'text', placeholder, onSave }: EditCellProps) {
  const [local, setLocal] = useState(value);
  return (
    <Input
      type={type}
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if (local !== value) onSave(local);
      }}
      className="h-7 min-w-0 border-0 bg-transparent px-1 focus-visible:ring-1"
    />
  );
}

// ── Строка таблицы ────────────────────────────────────────────────────────────

interface RowProps {
  plan: GanttDailyPlanItem;
  onUpdate: (field: string, value: string) => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function DailyPlanRow({ plan, onUpdate, onDelete, isDeleting }: RowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium max-w-48 truncate" title={plan.task.name}>
        {plan.task.name}
      </TableCell>
      <TableCell className="w-24">
        <EditCell
          type="number"
          value={plan.workers !== null ? String(plan.workers) : ''}
          placeholder="—"
          onSave={(v) => onUpdate('workers', v)}
        />
      </TableCell>
      <TableCell className="min-w-32">
        <EditCell
          value={plan.machinery ?? ''}
          placeholder="—"
          onSave={(v) => onUpdate('machinery', v)}
        />
      </TableCell>
      <TableCell className="w-20">
        <EditCell
          type="number"
          value={plan.volume !== null ? String(plan.volume) : ''}
          placeholder="—"
          onSave={(v) => onUpdate('volume', v)}
        />
      </TableCell>
      <TableCell className="w-16">
        <EditCell
          value={plan.unit ?? ''}
          placeholder="ед."
          onSave={(v) => onUpdate('unit', v)}
        />
      </TableCell>
      <TableCell className="min-w-36">
        <EditCell
          value={plan.notes ?? ''}
          placeholder="—"
          onSave={(v) => onUpdate('notes', v)}
        />
      </TableCell>
      <TableCell className="w-10 text-right">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive"
          disabled={isDeleting}
          onClick={onDelete}
        >
          {isDeleting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Trash2 className="h-3 w-3" />
          )}
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ── Главный компонент ──────────────────────────────────────────────────────────

export function GanttDailyTable({ objectId, versionId, date }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { plans, isLoading } = useGanttDailyPlans(objectId, versionId, date);
  const createMutation = useCreateDailyPlan(objectId, versionId);
  const updateMutation = useUpdateDailyPlan(objectId, versionId);
  const deleteMutation = useDeleteDailyPlan(objectId, versionId);

  const totalWorkers = plans.reduce((sum, p) => sum + (p.workers ?? 0), 0);

  function handleUpdate(plan: GanttDailyPlanItem, field: string, raw: string) {
    let value: number | string | null = raw === '' ? null : raw;
    if (field === 'workers') value = raw === '' ? null : parseInt(raw, 10);
    if (field === 'volume') value = raw === '' ? null : parseFloat(raw);
    updateMutation.mutate({ dailyId: plan.id, [field]: value });
  }

  function handleDelete(dailyId: string) {
    setDeletingId(dailyId);
    deleteMutation.mutate(dailyId, { onSettled: () => setDeletingId(null) });
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Наименование работы</TableHead>
            <TableHead className="w-24">Рабочие</TableHead>
            <TableHead>Техника</TableHead>
            <TableHead className="w-20">Объём</TableHead>
            <TableHead className="w-16">Ед.</TableHead>
            <TableHead>Примечание</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                Нет записей на этот день. Нажмите «Добавить запись».
              </TableCell>
            </TableRow>
          ) : (
            plans.map((plan) => (
              <DailyPlanRow
                key={plan.id}
                plan={plan}
                onUpdate={(field, val) => handleUpdate(plan, field, val)}
                onDelete={() => handleDelete(plan.id)}
                isDeleting={deletingId === plan.id}
              />
            ))
          )}
        </TableBody>
        {plans.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">Итого рабочих</TableCell>
              <TableCell className="font-bold">{totalWorkers} чел.</TableCell>
              <TableCell colSpan={5} />
            </TableRow>
          </TableFooter>
        )}
      </Table>

      <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
        <Plus className="mr-1 h-4 w-4" />
        Добавить запись
      </Button>

      <GanttAddDailyPlanDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        objectId={objectId}
        versionId={versionId}
        planDate={date}
        onSubmit={(input) => createMutation.mutate(input, { onSuccess: () => setAddOpen(false) })}
        isPending={createMutation.isPending}
      />
    </div>
  );
}
