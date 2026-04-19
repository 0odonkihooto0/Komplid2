'use client';

import { useQuery } from '@tanstack/react-query';
import type { ProjectStatus } from '@prisma/client';

export interface ProjectDetail {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  generalContractor: string | null;
  customer: string | null;
  status: ProjectStatus;
  createdAt: string;
  _count: { contracts: number };
}

export function useProject(projectId: string) {
  const { data: project, isLoading } = useQuery<ProjectDetail>({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  return { project, isLoading };
}
