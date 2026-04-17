'use client';

import { useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/useToast';
import { type GlobalTask, type TaskStatus } from './useGlobalTasks';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: GlobalTask;
}

const localizer = dateFnsLocalizer({
  format: (date: Date, fmt: string) => format(date, fmt, { locale: ru }),
  parse: (value: string, fmt: string, referenceDate: Date) =>
    parse(value, fmt, referenceDate, { locale: ru }),
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { ru },
});

const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar);

const STATUS_COLORS: Record<TaskStatus, string> = {
  OPEN: '#9ca3af',
  PLANNED: '#0ea5e9',
  IN_PROGRESS: '#3b82f6',
  UNDER_REVIEW: '#a855f7',
  REVISION: '#f97316',
  DONE: '#22c55e',
  IRRELEVANT: '#d1d5db',
  CANCELLED: '#ef4444',
};

interface Props {
  grouping: string;
  groupId?: string | null;
  search?: string;
}

export function TaskCalendarView({ grouping, groupId, search }: Props) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const queryKey = ['global-tasks-calendar', { grouping, groupId, search }];

  const { data: tasks = [], isLoading } = useQuery<GlobalTask[]>({
    queryKey,
    queryFn: async () => {
      const sp = new URLSearchParams({ grouping, page: '1', pageSize: '200' });
      if (groupId) sp.set('groupId', groupId);
      if (search) sp.set('search', search);
      const res = await fetch(`/api/tasks?${sp.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data.tasks as GlobalTask[];
    },
    staleTime: 30_000,
  });

  const updateDeadlineMutation = useMutation({
    mutationFn: async ({ taskId, deadline }: { taskId: string; deadline: Date }) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadline: deadline.toISOString() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка обновления срока');
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });

  const events: CalendarEvent[] = useMemo(
    () =>
      tasks
        .filter((t) => t.deadline ?? t.plannedStartDate)
        .map((t) => {
          const start = t.plannedStartDate ? new Date(t.plannedStartDate) : new Date(t.deadline!);
          const end = t.deadline ? new Date(t.deadline) : addDays(start, 1);
          return { id: t.id, title: t.title, start, end, resource: t };
        }),
    [tasks],
  );

  const handleEventDrop = useCallback(
    ({ event, start }: { event: CalendarEvent; start: Date | string }) => {
      const newDeadline = start instanceof Date ? start : new Date(start);
      if (!window.confirm(`Изменить срок «${event.title}» на ${newDeadline.toLocaleDateString('ru-RU')}?`)) return;
      void updateDeadlineMutation.mutateAsync({ taskId: event.id, deadline: newDeadline }).catch((err: unknown) => {
        toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Не удалось обновить срок', variant: 'destructive' });
      });
    },
    [updateDeadlineMutation],
  );

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const color = STATUS_COLORS[event.resource.status];
    return { style: { backgroundColor: color, borderColor: color, color: '#fff', borderRadius: '4px', fontSize: '12px' } };
  }, []);

  const messages = {
    allDay: 'Весь день', previous: '‹', next: '›', today: 'Сегодня',
    month: 'Месяц', week: 'Неделя', day: 'День', agenda: 'Повестка',
    date: 'Дата', time: 'Время', event: 'Задача', noEventsInRange: 'Нет задач за период',
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <Skeleton className="h-[500px] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <DnDCalendar
        localizer={localizer}
        events={events}
        view={view}
        date={date}
        onView={setView}
        onNavigate={setDate}
        onEventDrop={handleEventDrop}
        eventPropGetter={eventStyleGetter}
        messages={messages}
        culture="ru"
        style={{ height: '100%', minHeight: 500 }}
        popup
        selectable={false}
        resizable={false}
      />
    </div>
  );
}
