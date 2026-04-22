'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DiscountType, PlanCategory } from '@prisma/client';

export interface CreatePromoCodeInput {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountRub?: number;
  maxTotalRedemptions?: number;
  maxPerUser?: number;
  validUntil?: string;
  isFirstPaymentOnly?: boolean;
  applicableToCategories?: PlanCategory[];
  planIds?: string[];
}

// Список всех промокодов
export function useAdminPromoCodes() {
  return useQuery({
    queryKey: ['admin-promo-codes'],
    queryFn: async () => {
      const r = await fetch('/api/admin/billing/promo-codes');
      const json = await r.json();
      if (!json.success) throw new Error(json.error);
      return json.data as unknown[];
    },
    staleTime: 30_000,
  });
}

// Создание промокода
export function useCreatePromoCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePromoCodeInput) => {
      const r = await fetch('/api/admin/billing/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const json = await r.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-promo-codes'] }),
  });
}

// Деактивация промокода
export function useDeactivatePromoCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/billing/promo-codes/${id}`, { method: 'DELETE' });
      const json = await r.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-promo-codes'] }),
  });
}
