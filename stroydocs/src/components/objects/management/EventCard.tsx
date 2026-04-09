'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Users,
  ClipboardCheck,
  CheckSquare,
  Search,
  Building2,
  Calendar,
  MapPin,
  FileText,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEventMutations, type ProjectEvent, type ProjectEventType, type ProjectEventStatus } from './useProjectEvents';
import { CreateEventDialog } from './CreateEventDialog';
import { UploadProtocolDialog } from './UploadProtocolDialog';

// ─────────────────────────────────────────────
// Константы
// ─────────────────────────────────────────────

const EVENT_TYPE_LABELS: Record<ProjectEventType, string> = {
  MEETING: 'Совещание',
  GSN_INSPECTION: 'Проверка ГСН',
  ACCEPTANCE: 'Приёмка',
  AUDIT: 'Аудит',
  COMMISSIONING: 'Сдача в эксплуатацию',
  OTHER: 'Прочее',
};

const EVENT_STATUS_LABELS: Record<ProjectEventStatus, string> = {
  PLANNED: 'Запланировано',
  IN_PROGRESS: 'Идёт',
  COMPLETED: 'Завершено',
  CANCELLED: 'Отменено',
  POSTPONED: 'Перенесено',
};

const EVENT_STATUS_STYLES: Record<ProjectEventStatus, string> = {
  PLANNED: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  POSTPONED: 'bg-gray-100 text-gray-600',
};

function EventTypeIcon({ type }: { type: ProjectEventType }) {
  const icons: Record<ProjectEventType, React.ReactNode> = {
    MEETING: <Users className="h-4 w-4" />,
    GSN_INSPECTION: <ClipboardCheck className="h-4 w-4" />,
    ACCEPTANCE: <CheckSquare className="h-4 w-4" />,
    AUDIT: <Search className="h-4 w-4" />,
    COMMISSIONING: <Building2 className="h-4 w-4" />,
    OTHER: <Calendar className="h-4 w-4" />,
  };
  return <>{icons[type]}</>;
}

// ─────────────────────────────────────────────
// Компонент карточки
// ─────────────────────────────────────────────

interface Props {
  event: ProjectEvent;
  projectId: string;
}

export function EventCard({ event, projectId }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const { deleteEvent } = useEventMutations(projectId);

  const handleDelete = () => {
    if (!window.confirm(`Удалить мероприятие «${event.title}»?`)) return;
    deleteEvent.mutate(event.id);
  };

  const scheduledDate = new Date(event.scheduledAt);

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-4 shadow-sm">
      {/* Иконка типа */}
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <EventTypeIcon type={event.eventType} />
      </div>

      {/* Основное содержимое */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{event.title}</span>
          <span
            className={cn(
              'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
              EVENT_STATUS_STYLES[event.status],
            )}
          >
            {EVENT_STATUS_LABELS[event.status]}
          </span>
          <span className="text-xs text-muted-foreground">
            {EVENT_TYPE_LABELS[event.eventType]}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          <Calendar className="mr-1 inline h-3.5 w-3.5" />
          {format(scheduledDate, 'dd MMMM yyyy, HH:mm', { locale: ru })}
        </p>

        {event.location && (
          <p className="text-sm text-muted-foreground">
            <MapPin className="mr-1 inline h-3.5 w-3.5" />
            {event.location}
          </p>
        )}

        {event.contract && (
          <p className="text-sm text-muted-foreground">
            Договор: {event.contract.number} — {event.contract.name}
          </p>
        )}

        {event.protocolFileName && (
          <p className="text-sm text-green-600">
            <FileText className="mr-1 inline h-3.5 w-3.5" />
            Протокол: {event.protocolFileName}
          </p>
        )}
      </div>

      {/* Действия */}
      <div className="flex shrink-0 items-center gap-1">
        {event.status === 'COMPLETED' && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Загрузить протокол"
            title="Загрузить протокол"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Редактировать"
          title="Редактировать"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Удалить"
          title="Удалить"
          onClick={handleDelete}
          disabled={deleteEvent.isPending}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <CreateEventDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        projectId={projectId}
        event={event}
      />

      <UploadProtocolDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        projectId={projectId}
        event={event}
      />
    </div>
  );
}
