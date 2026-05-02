'use client';

// Вертикальная хроника событий строительства для публичного портала
import { CheckCircle, Camera, AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEventsTimeline, type TimelineEvent } from './useEventsTimeline';

interface EventsTimelineProps {
  token: string;
}

// Иконка и цвет в зависимости от типа события
function EventIcon({ type }: { type: string }): ReactNode {
  if (type === 'SIGNED_DOC') {
    return <CheckCircle size={18} className="text-green-500 shrink-0" aria-label="Подписан акт" />;
  }
  if (type === 'DEFECT_CLOSED') {
    return (
      <CheckCircle size={18} className="text-blue-500 shrink-0" aria-label="Замечание закрыто" />
    );
  }
  if (type === 'PHOTO_ADDED') {
    return <Camera size={18} className="text-gray-400 shrink-0" aria-label="Добавлено фото" />;
  }
  return <AlertCircle size={18} className="text-gray-400 shrink-0" aria-label="Событие" />;
}

// Отдельный элемент хроники
function TimelineItem({ event }: { event: TimelineEvent }) {
  const date = new Date(event.date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="flex gap-3">
      {/* Иконка с маркером на линии */}
      <div className="absolute -left-[25px] flex items-center justify-center w-5 h-5 bg-white">
        <EventIcon type={event.type} />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{date}</p>
        <p className="text-sm font-medium text-gray-800 leading-snug">{event.title}</p>
        {event.description && (
          <p className="text-xs text-gray-500 mt-0.5">{event.description}</p>
        )}
      </div>
    </div>
  );
}

export function EventsTimeline({ token }: EventsTimelineProps) {
  const { data, isLoading } = useEventsTimeline(token);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Хроника строительства</h2>

      {/* Skeleton при загрузке */}
      {isLoading && (
        <div className="animate-pulse space-y-4 border-l-2 border-blue-100 ml-3 pl-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 bg-gray-100 rounded w-20" />
              <div className="h-4 bg-gray-100 rounded w-56" />
            </div>
          ))}
        </div>
      )}

      {/* Вертикальный timeline */}
      {data && data.events.length > 0 && (
        <div className="relative border-l-2 border-blue-200 ml-3 pl-6 space-y-6">
          {data.events.map((event) => (
            <TimelineItem key={event.id} event={event} />
          ))}
        </div>
      )}

      {/* Пустое состояние */}
      {data && data.events.length === 0 && (
        <p className="text-sm text-gray-400">События пока не зафиксированы</p>
      )}
    </section>
  );
}
