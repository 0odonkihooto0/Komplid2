'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useRequests,
  type MaterialRequestItem,
  type MaterialRequestStatus,
  type RequestsFilter,
} from './usePlanning';

// ─── Хук состояния реестра заявок ────────────────────────────────────────────

export function useRequestsView(objectId: string) {
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState<MaterialRequestStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string>('');

  const filters: RequestsFilter = {
    status: statusFilter || undefined,
    from: dateFrom || undefined,
    to: dateTo || undefined,
    approvalStatus: approvalStatusFilter || undefined,
  };

  const { requests, isLoading } = useRequests(objectId, filters);

  function handleRowClick(row: MaterialRequestItem) {
    router.push(`/objects/${objectId}/resources/requests/${row.id}`);
  }

  function handleReset() {
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setApprovalStatusFilter('');
  }

  return {
    statusFilter,
    setStatusFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    approvalStatusFilter,
    setApprovalStatusFilter,
    requests,
    isLoading,
    hasFilters: !!(statusFilter || dateFrom || dateTo || approvalStatusFilter),
    handleRowClick,
    handleReset,
  };
}
