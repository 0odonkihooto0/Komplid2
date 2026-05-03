'use client';

import { useQuery } from '@tanstack/react-query';

// Тип проекта ремонта для B2C-заказчика
export interface CustomerProject {
  id: string;
  name: string;
  address?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface CustomerProjectsResponse {
  projects: CustomerProject[];
  total: number;
}

// Хук загрузки проектов из кабинета B2C-заказчика
export function useCustomerDashboard() {
  const query = useQuery({
    queryKey: ['customer-projects'],
    queryFn: async () => {
      const res = await fetch('/api/customer/projects');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as CustomerProjectsResponse;
    },
  });

  return {
    projects: query.data?.projects ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  };
}
