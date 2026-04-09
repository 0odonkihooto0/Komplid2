'use client';

import { useState, useMemo } from 'react';
import { LayoutList, CalendarDays, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectEvents, type EventFilters, type ProjectEvent } from './useProjectEvents';
import { EventCard } from './EventCard';
import { CreateEventDialog } from './CreateEventDialog';
import { EventCalendarView } from './EventCalendarView';

// ─────────────────────────────────────────────
// Константы фильтров
// ─────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: '__all__', label: 'Все статусы' },
  { value: 'PLANNED', label: 'Запланировано' },
  { value: 'IN_PROGRESS', label: 'Идёт' },
  { value: 'COMPLETED', label: 'Завершено' },
  { value: 'CANCELLED', label: 'Отменено' },
  { value: 'POSTPONED', label: 'Перенесено' },
];

const TYPE_OPTIONS = [
  { value: '__all__', label: 'Все типы' },
  { value: 'MEETING', label: 'Совещание' },
  { value: 'GSN_INSPECTION', label: 'Проверка ГСН' },
  { value: 'ACCEPTANCE', label: 'Приёмка' },
  { value: 'AUDIT', label: 'Аудит' },
  { value: 'COMMISSIONING', label: 'Сдача в эксплуатацию' },
  { value: 'OTHER', label: 'Прочее' },
];

type ViewMode = 'list' | 'calendar';

// ─────────────────────────────────────────────
// Компонент
// ─────────────────────────────────────────────

interface Props {
  objectId: string;
}

export function EventsView({ objectId }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<EventFilters>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<ProjectEvent | null>(null);

  const { data: events = [], isLoading } = useProjectEvents(objectId, filters);

  // Разбиваем на предстоящие и прошедшие
  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    return {
      upcoming: events.filter((e) => new Date(e.scheduledAt) >= now),
      past: events.filter((e) => new Date(e.scheduledAt) < now),
    };
  }, [events]);

  const handleCalendarSelect = (event: ProjectEvent) => {
    setEditEvent(event);
  };

  return (
    <div className="space-y-4 p-6">
      {/* Шапка */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-lg font-semibold">Мероприятия</h2>

        {/* Фильтр по статусу */}
        <Select
          value={filters.status ?? '__all__'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, status: v === '__all__' ? undefined : v }))
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Фильтр по типу */}
        <Select
          value={filters.eventType ?? '__all__'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, eventType: v === '__all__' ? undefined : v }))
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Переключатель вид: список / календарь */}
        <div className="flex rounded-md border">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="icon"
            className="rounded-r-none"
            onClick={() => setViewMode('list')}
            aria-label="Список"
            title="Список"
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="icon"
            className="rounded-l-none border-l"
            onClick={() => setViewMode('calendar')}
            aria-label="Календарь"
            title="Календарь"
          >
            <CalendarDays className="h-4 w-4" />
          </Button>
        </div>

        {/* Кнопка создания */}
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить
        </Button>
      </div>

      {/* Контент */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : viewMode === 'calendar' ? (
        <EventCalendarView events={events} onSelectEvent={handleCalendarSelect} />
      ) : (
        <EventListView events={events} upcoming={upcoming} past={past} objectId={objectId} />
      )}

      {/* Диалоги */}
      <CreateEventDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={objectId}
      />

      <CreateEventDialog
        open={!!editEvent}
        onOpenChange={(open) => { if (!open) setEditEvent(null); }}
        projectId={objectId}
        event={editEvent}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Список мероприятий (предстоящие + прошедшие)
// ─────────────────────────────────────────────

function EventListView({
  events,
  upcoming,
  past,
  objectId,
}: {
  events: ProjectEvent[];
  upcoming: ProjectEvent[];
  past: ProjectEvent[];
  objectId: string;
}) {
  if (events.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Нет мероприятий — добавьте первое
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Предстоящие ({upcoming.length})
          </h3>
          {upcoming.map((e) => (
            <EventCard key={e.id} event={e} projectId={objectId} />
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Прошедшие ({past.length})
          </h3>
          {past.map((e) => (
            <EventCard key={e.id} event={e} projectId={objectId} />
          ))}
        </section>
      )}
    </div>
  );
}
