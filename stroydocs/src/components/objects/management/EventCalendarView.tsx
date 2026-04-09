'use client';

import { useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, type Event as RBCEvent } from 'react-big-calendar';
import {
  format,
  parse,
  startOfWeek,
  getDay,
  addHours,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { type ProjectEvent, type ProjectEventType } from './useProjectEvents';

// Настройка localizer с русской локалью
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ru }),
  getDay,
  locales: { ru },
});

// Русские названия для навигации календаря
const messages = {
  today: 'Сегодня',
  previous: 'Назад',
  next: 'Вперёд',
  month: 'Месяц',
  week: 'Неделя',
  day: 'День',
  agenda: 'Список',
  date: 'Дата',
  time: 'Время',
  event: 'Мероприятие',
  noEventsInRange: 'Нет мероприятий в этом периоде',
  showMore: (total: number) => `+${total} ещё`,
};

// Цвета по типу мероприятия
const EVENT_TYPE_COLORS: Record<ProjectEventType, string> = {
  MEETING: '#2563EB',         // синий
  GSN_INSPECTION: '#D97706',  // оранжевый
  ACCEPTANCE: '#16A34A',      // зелёный
  AUDIT: '#7C3AED',           // фиолетовый
  COMMISSIONING: '#0891B2',   // голубой
  OTHER: '#6B7280',           // серый
};

// Тип события для react-big-calendar
interface CalendarEvent extends RBCEvent {
  resource: ProjectEvent;
}

// ─────────────────────────────────────────────
// Компонент
// ─────────────────────────────────────────────

interface Props {
  events: ProjectEvent[];
  onSelectEvent?: (event: ProjectEvent) => void;
}

export function EventCalendarView({ events, onSelectEvent }: Props) {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');

  // Трансформация ProjectEvent → формат react-big-calendar
  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    return events.map((e) => {
      const start = new Date(e.scheduledAt);
      return {
        title: e.title,
        start,
        end: addHours(start, 1), // длительность 1 час по умолчанию
        resource: e,
      };
    });
  }, [events]);

  // Раскраска события по типу
  const eventPropGetter = (calEvent: CalendarEvent) => {
    const color = EVENT_TYPE_COLORS[calEvent.resource.eventType] ?? '#6B7280';
    return {
      style: {
        backgroundColor: color,
        borderColor: color,
        color: '#fff',
        borderRadius: '4px',
        fontSize: '12px',
      },
    };
  };

  const handleSelectEvent = (calEvent: CalendarEvent) => {
    onSelectEvent?.(calEvent.resource);
  };

  return (
    <div className="h-[600px] rounded-lg border bg-card p-2">
      <Calendar<CalendarEvent>
        localizer={localizer}
        events={calendarEvents}
        date={date}
        view={view}
        onNavigate={setDate}
        onView={(v) => setView(v as typeof view)}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventPropGetter}
        messages={messages}
        culture="ru"
        style={{ height: '100%' }}
      />
    </div>
  );
}
