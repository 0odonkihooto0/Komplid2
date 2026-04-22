'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SubscriptionStatus, BillingPeriod } from '@prisma/client';

export interface SubscriptionFilters {
  status: SubscriptionStatus | 'ALL';
  billingPeriod: BillingPeriod | 'ALL';
  search: string;
  skip: number;
  take: number;
}

// Получение списка подписок с фильтрами
export function useAdminSubscriptions(filters: SubscriptionFilters) {
  const params = new URLSearchParams();
  if (filters.status !== 'ALL') params.set('status', filters.status);
  if (filters.billingPeriod !== 'ALL') params.set('billingPeriod', filters.billingPeriod);
  if (filters.search) params.set('search', filters.search);
  params.set('skip', String(filters.skip));
  params.set('take', String(filters.take));

  return useQuery({
    queryKey: ['admin-billing-subscriptions', filters],
    queryFn: async () => {
      const r = await fetch(`/api/admin/billing/subscriptions?${params}`);
      const json = await r.json();
      if (!json.success) throw new Error(json.error);
      return json as { data: unknown[]; meta: { total: number; page: number; limit: number } };
    },
    staleTime: 30_000,
  });
}

// Получение одной подписки по id
export function useAdminSubscription(id: string) {
  return useQuery({
    queryKey: ['admin-billing-subscription', id],
    queryFn: async () => {
      const r = await fetch(`/api/admin/billing/subscriptions/${id}`);
      const json = await r.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!id,
    staleTime: 15_000,
  });
}

// Продление подписки на N дней
export function useExtendSubscription(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (days: number) => {
      const r = await fetch(`/api/admin/billing/subscriptions/${id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });
      const json = await r.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { newPeriodEnd: string; days: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-billing-subscription', id] });
      qc.invalidateQueries({ queryKey: ['admin-billing-subscriptions'] });
    },
  });
}

// Отмена подписки администратором
export function useCancelSubscription(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/admin/billing/subscriptions/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await r.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-billing-subscription', id] });
      qc.invalidateQueries({ queryKey: ['admin-billing-subscriptions'] });
    },
  });
}

// Возврат денег за платёж
export function useRefundPayment(subscriptionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { paymentId: string; amountRub: number; reason?: string }) => {
      const r = await fetch(`/api/admin/billing/subscriptions/${subscriptionId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const json = await r.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { refundId: string; status: string; amountRub: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-billing-subscription', subscriptionId] });
    },
  });
}

// Действия dunning: повтор, grace, expire
export function useDunningRetry(subscriptionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/admin/billing/dunning/${subscriptionId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await r.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-billing-dunning'] }),
  });
}

export function useDunningToGrace(subscriptionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/admin/billing/dunning/${subscriptionId}/grace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await r.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-billing-dunning'] }),
  });
}

export function useDunningToExpired(subscriptionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/admin/billing/dunning/${subscriptionId}/expire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await r.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-billing-dunning'] }),
  });
}

// Список dunning (PAST_DUE + GRACE подписки)
export function useAdminDunning() {
  return useQuery({
    queryKey: ['admin-billing-dunning'],
    queryFn: async () => {
      const r = await fetch('/api/admin/billing/dunning');
      const json = await r.json();
      if (!json.success) throw new Error(json.error);
      return json.data as unknown[];
    },
    staleTime: 30_000,
  });
}
