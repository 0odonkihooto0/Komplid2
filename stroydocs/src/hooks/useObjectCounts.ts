import { useQuery } from '@tanstack/react-query';

interface CountsSidebar {
  info: null;
  sed: number;
  management: number;
  pir: number;
  gpr: number;
  resources: number;
  journals: number;
  id: number;
  stroykontrol: number;
}

interface CountsInfoTabs {
  participants: number;
  indicators: number;
  limitsRisks: number;
  correspondence: number;
  rfi: number;
  tasks: number;
  photos: null;
  videos: null;
  files: number;
}

export interface ObjectCounts {
  sidebar: CountsSidebar;
  infoTabs: CountsInfoTabs;
}

export function useObjectCounts(projectId: string) {
  return useQuery<ObjectCounts>({
    queryKey: ['counts', 'object', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/counts`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as ObjectCounts;
    },
    enabled: !!projectId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
