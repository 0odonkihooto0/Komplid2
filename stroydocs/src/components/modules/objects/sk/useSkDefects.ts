'use client';

import { useState } from 'react';
import {
  useDefects,
  useDeleteDefect,
  useChangeDefectStatus,
  useAcceptDefect,
  useRejectDefect,
  useExtendDefectDeadline,
  type DefectFilters,
} from '@/components/modules/defects/useDefects';

export function useSkDefects(objectId: string) {
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const filters: DefectFilters = {
    status: statusFilter || undefined,
    category: categoryFilter || undefined,
    overdueOnly,
  };

  const query = useDefects(objectId, filters);
  const deleteDefect = useDeleteDefect(objectId);
  const changeStatus = useChangeDefectStatus(objectId);
  const acceptDefect = useAcceptDefect(objectId);
  const rejectDefect = useRejectDefect(objectId);
  const extendDeadline = useExtendDefectDeadline(objectId);

  return {
    // данные
    data: query.data,
    isLoading: query.isLoading,
    defects: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    // фильтры
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    overdueOnly,
    setOverdueOnly,
    // мутации
    deleteDefect,
    changeStatus,
    acceptDefect,
    rejectDefect,
    extendDeadline,
  };
}
