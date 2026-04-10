'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateRegulation, type RegulationStep } from '@/hooks/useWorkflowRegulations';

const ROLE_LABELS: Record<string, string> = {
  DEVELOPER: 'Проектировщик',
  CONTRACTOR: 'Подрядчик',
  SUPERVISION: 'Строительный контроль',
  SUBCONTRACTOR: 'Субподрядчик',
};
const ROLES = Object.keys(ROLE_LABELS) as Array<keyof typeof ROLE_LABELS>;

interface StepItem extends RegulationStep {
  _id: string; // локальный key для DnD
}

interface Props {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Draggable step row ────────────────────────────────────────────────────

function SortableStepRow({
  step,
  index,
  onRoleChange,
  onRemove,
  canRemove,
}: {
  step: StepItem;
  index: number;
  onRoleChange: (id: string, role: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded border bg-background px-2 py-2"
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="w-5 text-center text-xs text-muted-foreground">{index + 1}</span>

      <div className="flex-1">
        <Select
          value={step.role}
          onValueChange={(val) => onRoleChange(step._id, val)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        disabled={!canRemove}
        onClick={() => onRemove(step._id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── Main dialog ───────────────────────────────────────────────────────────

let _counter = 0;
function newId() { return `step-${++_counter}`; }

export function CreateRegulationDialog({ orgId, open, onOpenChange }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<StepItem[]>([
    { _id: newId(), role: 'CONTRACTOR' },
  ]);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateRegulation(orgId);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSteps((prev) => {
        const oldIdx = prev.findIndex((s) => s._id === active.id);
        const newIdx = prev.findIndex((s) => s._id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  }, []);

  const addStep = () =>
    setSteps((prev) => [...prev, { _id: newId(), role: 'CONTRACTOR' }]);

  const removeStep = (id: string) =>
    setSteps((prev) => prev.filter((s) => s._id !== id));

  const changeRole = (id: string, role: string) =>
    setSteps((prev) =>
      prev.map((s) =>
        s._id === id ? { ...s, role: role as RegulationStep['role'] } : s
      )
    );

  const handleClose = (val: boolean) => {
    if (!val) {
      setName('');
      setDescription('');
      setSteps([{ _id: newId(), role: 'CONTRACTOR' }]);
      setError(null);
    }
    onOpenChange(val);
  };

  const handleSubmit = () => {
    setError(null);
    if (!name.trim()) { setError('Введите наименование регламента'); return; }
    if (steps.length === 0) { setError('Добавьте хотя бы один шаг'); return; }

    createMutation.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        stepsTemplate: steps.map(({ role }) => ({ role })),
      },
      {
        onSuccess: () => handleClose(false),
        onError: (err) => setError(err.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Создать регламент ДО</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="reg-name">Наименование *</Label>
            <Input
              id="reg-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Стандартное согласование"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="reg-desc">Описание</Label>
            <Textarea
              id="reg-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание маршрута..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Шаги согласования</Label>
              <Button type="button" variant="outline" size="sm" onClick={addStep}>
                <Plus className="mr-1 h-3 w-3" />
                Добавить шаг
              </Button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={steps.map((s) => s._id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1.5">
                  {steps.map((step, idx) => (
                    <SortableStepRow
                      key={step._id}
                      step={step}
                      index={idx}
                      onRoleChange={changeRole}
                      onRemove={removeStep}
                      canRemove={steps.length > 1}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <p className="text-xs text-muted-foreground">
              Перетаскивайте шаги для изменения порядка
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Создание...' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
