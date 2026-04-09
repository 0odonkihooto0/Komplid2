import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

// ─────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────

export type ProjectEventType =
  | 'MEETING'
  | 'GSN_INSPECTION'
  | 'ACCEPTANCE'
  | 'AUDIT'
  | 'COMMISSIONING'
  | 'OTHER';

export type ProjectEventStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'POSTPONED';

export interface ProjectEventOrganizer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ProjectEventContract {
  id: string;
  number: string;
  name: string;
}

export interface ProjectEvent {
  id: string;
  title: string;
  description: string | null;
  eventType: ProjectEventType;
  status: ProjectEventStatus;
  scheduledAt: string;
  location: string | null;
  notifyDays: number;
  projectId: string;
  contractId: string | null;
  organizerId: string;
  participantIds: string[];
  protocolS3Key: string | null;
  protocolFileName: string | null;
  createdAt: string;
  updatedAt: string;
  organizer: ProjectEventOrganizer;
  contract: ProjectEventContract | null;
}

export interface EventFilters {
  eventType?: string;
  status?: string;
  from?: string;
  to?: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  eventType: ProjectEventType;
  scheduledAt: string;
  location?: string;
  notifyDays?: number;
  contractId?: string;
  participantIds?: string[];
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  status?: ProjectEventStatus;
  protocolS3Key?: string;
  protocolFileName?: string;
}

// ─────────────────────────────────────────────
// Хуки запросов
// ─────────────────────────────────────────────

export function useProjectEvents(projectId: string, filters?: EventFilters) {
  const params = new URLSearchParams();
  if (filters?.eventType) params.set('eventType', filters.eventType);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.from) params.set('from', filters.from);
  if (filters?.to) params.set('to', filters.to);

  const query = params.toString();

  return useQuery<ProjectEvent[]>({
    queryKey: ['project-events', projectId, filters],
    queryFn: async () => {
      const res = await fetch(
        `/api/objects/${projectId}/events${query ? `?${query}` : ''}`,
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки мероприятий');
      return json.data as ProjectEvent[];
    },
    enabled: !!projectId,
  });
}

// ─────────────────────────────────────────────
// Хуки мутаций
// ─────────────────────────────────────────────

export function useEventMutations(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['project-events', projectId] });

  // Создать мероприятие
  const createEvent = useMutation({
    mutationFn: async (data: CreateEventInput) => {
      const res = await fetch(`/api/objects/${projectId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания мероприятия');
      return json.data as ProjectEvent;
    },
    onSuccess: () => {
      toast({ title: 'Мероприятие создано' });
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Обновить мероприятие
  const updateEvent = useMutation({
    mutationFn: async ({ eventId, data }: { eventId: string; data: UpdateEventInput }) => {
      const res = await fetch(`/api/objects/${projectId}/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка обновления мероприятия');
      return json.data as ProjectEvent;
    },
    onSuccess: () => {
      toast({ title: 'Мероприятие обновлено' });
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Удалить мероприятие
  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch(`/api/objects/${projectId}/events/${eventId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления мероприятия');
    },
    onSuccess: () => {
      toast({ title: 'Мероприятие удалено' });
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Загрузить протокол мероприятия: presigned URL → PUT → PATCH
  const uploadProtocol = async (eventId: string, file: File): Promise<void> => {
    // 1. Получить presigned URL
    const params = new URLSearchParams({
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
    });
    const urlRes = await fetch(
      `/api/objects/${projectId}/events/${eventId}/protocol?${params}`,
    );
    const urlJson = await urlRes.json();
    if (!urlJson.success) throw new Error(urlJson.error ?? 'Ошибка получения URL');

    const { presignedUrl, s3Key } = urlJson.data as { presignedUrl: string; s3Key: string };

    // 2. Загрузить файл напрямую в S3
    const putRes = await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    if (!putRes.ok) throw new Error('Ошибка загрузки файла в хранилище');

    // 3. Обновить мероприятие с ключом протокола
    await updateEvent.mutateAsync({
      eventId,
      data: { protocolS3Key: s3Key, protocolFileName: file.name },
    });
  };

  return { createEvent, updateEvent, deleteEvent, uploadProtocol };
}
