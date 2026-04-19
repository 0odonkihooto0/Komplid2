'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PROJECT_STATUS_LABELS } from '@/utils/constants';
import type { ProjectStatus } from '@prisma/client';

interface ObjectSummary {
  id: string;
  name: string;
  status: ProjectStatus;
  address: string | null;
  customer: string | null;
  generalContractor: string | null;
}

interface Props {
  projectId: string;
}

export function ObjectHeader({ projectId }: Props) {
  const { data: project, isLoading } = useQuery<ObjectSummary>({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as ObjectSummary;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (!project) return null;

  const statusLabel = PROJECT_STATUS_LABELS[project.status as ProjectStatus] ?? project.status;

  // Строим строку участников (только непустые)
  const participants = [
    project.customer && `Заказчик: ${project.customer}`,
    project.generalContractor && `Генподрядчик: ${project.generalContractor}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="space-y-1">
      <Link
        href="/objects"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-label="Назад" />
        Все объекты
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <StatusBadge status={project.status} label={statusLabel} />
      </div>

      {(project.address || participants) && (
        <p className="text-sm text-muted-foreground">
          {[project.address, participants].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  );
}
