// Хук для загрузки данных о прогрессе выполнения работ на публичном портале
import { useQuery } from '@tanstack/react-query';

interface ProgressPoint {
  date: string;
  signedDocs: number;
  percent: number;
}

interface ProgressData {
  points: ProgressPoint[];
  total: number;
}

export function useProgressOverview(token: string) {
  return useQuery({
    queryKey: ['portal-progress', token],
    queryFn: async (): Promise<ProgressData> => {
      const res = await fetch(`/api/portal/${token}/progress`);
      if (!res.ok) throw new Error('Ошибка загрузки прогресса');
      const json = await res.json() as { success: boolean; data: ProgressData };
      return json.data;
    },
  });
}
