'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IdReadinessWidget } from './widgets/IdReadinessWidget';
import { DefectsMonitorWidget } from './widgets/DefectsMonitorWidget';
import { ContractsStatusWidget } from './widgets/ContractsStatusWidget';
import { SmrProgressWidget } from './widgets/SmrProgressWidget';
import { IdQualityWidget } from './widgets/IdQualityWidget';
import { ConstructionProgressWidget } from './widgets/ConstructionProgressWidget';
import { ObjectsWidget } from './widgets/ObjectsWidget';
import { MapWidget } from './widgets/MapWidget';
import { ObjectsBaseWidget } from '@/components/dashboard/widgets/ObjectsBaseWidget';
import { IssuesWidget } from '@/components/dashboard/widgets/IssuesWidget';
import { ContractsWidget } from '@/components/dashboard/widgets/ContractsWidget';
import { StagesWidget } from '@/components/dashboard/widgets/StagesWidget';
import { DashboardWidgetsManager } from './DashboardWidgetsManager';

interface Widget {
  id: string;
  type: string;
  title: string;
  colSpan: number;
  isVisible: boolean;
  config?: Record<string, unknown> | null;
}

interface SortableWidgetProps {
  widget: Widget;
  objectIds?: string[];
  onStatusFilter?: (status: string | null) => void;
}

// Компонент одного сортируемого виджета
function SortableWidget({ widget, objectIds, onStatusFilter }: SortableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const projectId = (widget.config?.projectId as string) ?? undefined;
  const spanClass = widget.colSpan === 3
    ? 'lg:col-span-3'
    : widget.colSpan === 2
      ? 'lg:col-span-2'
      : '';

  return (
    <div ref={setNodeRef} style={style} className={`relative group ${spanClass}`}>
      {/* Ручка перетаскивания */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 cursor-grab active:cursor-grabbing
                   opacity-0 group-hover:opacity-100 transition-opacity
                   p-1 rounded bg-muted/80"
        title="Перетащить виджет"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="text-muted-foreground">
          <circle cx="4" cy="3" r="1.2"/><circle cx="8" cy="3" r="1.2"/>
          <circle cx="4" cy="6" r="1.2"/><circle cx="8" cy="6" r="1.2"/>
          <circle cx="4" cy="9" r="1.2"/><circle cx="8" cy="9" r="1.2"/>
        </svg>
      </div>

      {widget.type === 'id_readiness' && <IdReadinessWidget projectId={projectId} />}
      {widget.type === 'defects_monitor' && <DefectsMonitorWidget />}
      {widget.type === 'contracts_status' && <ContractsStatusWidget />}
      {widget.type === 'smr_progress' && <SmrProgressWidget />}
      {widget.type === 'id_quality' && <IdQualityWidget />}
      {widget.type === 'construction_progress' && <ConstructionProgressWidget />}
      {widget.type === 'objects' && <ObjectsWidget objectIds={objectIds} />}
      {widget.type === 'map' && <MapWidget objectIds={objectIds} />}
      {widget.type === 'objects_base' && (
        <ObjectsBaseWidget objectIds={objectIds} onStatusFilter={onStatusFilter} />
      )}
      {widget.type === 'issues' && (
        <IssuesWidget
          mode={(widget.config?.mode as 'chart' | 'table') ?? 'chart'}
          objectIds={objectIds}
        />
      )}
      {widget.type === 'contracts_by_type' && <ContractsWidget objectIds={objectIds} />}
      {widget.type === 'stages' && <StagesWidget objectIds={objectIds} />}
    </div>
  );
}

interface DashboardWidgetsGridProps {
  objectIds?: string[];
  onStatusFilter?: (status: string | null) => void;
}

export function DashboardWidgetsGrid({ objectIds, onStatusFilter }: DashboardWidgetsGridProps) {
  const queryClient = useQueryClient();
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  const { data: widgets = [] } = useQuery<Widget[]>({
    queryKey: ['dashboard-widgets'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/widgets');
      const json = await res.json();
      return json.success ? json.data : [];
    },
    staleTime: 60 * 1000,
  });

  // Сохраняем новый порядок в БД
  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, index) =>
          fetch(`/api/dashboard/widgets/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position: index }),
          })
        )
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const currentOrder = localOrder ?? widgets.map((w) => w.id);
      const oldIndex = currentOrder.indexOf(active.id as string);
      const newIndex = currentOrder.indexOf(over.id as string);
      const newOrder = arrayMove(currentOrder, oldIndex, newIndex);

      setLocalOrder(newOrder);
      reorderMutation.mutate(newOrder);
    },
    [localOrder, widgets, reorderMutation]
  );

  // Применяем локальный порядок если есть
  const orderedWidgets =
    localOrder !== null
      ? localOrder
          .map((id) => widgets.find((w) => w.id === id))
          .filter((w): w is Widget => Boolean(w))
      : [...widgets].sort((a, b) => a.id.localeCompare(b.id));

  const visible = orderedWidgets.filter((w) => w.isVisible);

  if (widgets.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Кнопка настройки виджетов */}
      <div className="flex justify-end">
        <DashboardWidgetsManager widgets={widgets} />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visible.map((w) => w.id)} strategy={rectSortingStrategy}>
          <div className="grid gap-4 lg:grid-cols-3">
            {visible.map((widget) => (
              <SortableWidget
                key={widget.id}
                widget={widget}
                objectIds={objectIds}
                onStatusFilter={onStatusFilter}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
