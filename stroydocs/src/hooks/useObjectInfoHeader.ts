'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';

export interface ObjectSummaryData {
  object: {
    id: string;
    name: string;
    status: string;
    address: string | null;
    customer: string | null;
    generalContractor: string | null;
  };
  contracts: { totalAmount: number; paidAmount: number; percent: number };
  gpr: { totalAmount: number; completedAmount: number; percent: number };
  pir: { total: number; completed: number; percent: number };
  smr: { totalAmount: number; completedAmount: number; percent: number };
  prescriptions: { active: number; closed: number };
  executionDocs: {
    rejected: number;
    inReview: number;
    draft: number;
    signed: number;
    total: number;
  };
  designDocs: {
    withComments: number;
    inApproval: number;
    reviewPassed: number;
    approved: number;
    total: number;
  };
  prevObjectId: string | null;
  nextObjectId: string | null;
}

export function useObjectInfoHeader(objectId: string) {
  // Состояние развёрнутости — сохраняем в localStorage
  const [isExpanded, setIsExpanded] = useState(false);

  // Восстанавливаем состояние после гидрации
  useEffect(() => {
    const saved = localStorage.getItem('objectInfoHeaderExpanded');
    if (saved !== null) setIsExpanded(saved === 'true');
  }, []);

  const toggle = useCallback(() => {
    setIsExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('objectInfoHeaderExpanded', String(next));
      return next;
    });
  }, []);

  // Загружаем данные только при раскрытии панели
  const { data: summary, isLoading } = useQuery<ObjectSummaryData>({
    queryKey: ['object-summary', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/objects/${objectId}/summary`);
      const json: unknown = await res.json();
      const typed = json as { success: boolean; data: ObjectSummaryData; error?: string };
      if (!typed.success) throw new Error(typed.error ?? 'Ошибка загрузки сводки');
      return typed.data;
    },
    enabled: isExpanded,
    staleTime: 5 * 60 * 1000, // 5 минут
  });

  const router = useRouter();
  const pathname = usePathname();

  // Сохраняем путь модуля при навигации между объектами
  const moduleSubpath = pathname.replace(`/objects/${objectId}`, '');

  const goToPrev = useCallback(() => {
    if (summary?.prevObjectId) {
      router.push(`/objects/${summary.prevObjectId}${moduleSubpath}`);
    }
  }, [summary?.prevObjectId, moduleSubpath, router]);

  const goToNext = useCallback(() => {
    if (summary?.nextObjectId) {
      router.push(`/objects/${summary.nextObjectId}${moduleSubpath}`);
    }
  }, [summary?.nextObjectId, moduleSubpath, router]);

  const goToEdit = useCallback(() => {
    router.push(`/objects/${objectId}/passport`);
  }, [objectId, router]);

  return {
    isExpanded,
    toggle,
    summary,
    isLoading,
    goToPrev,
    goToNext,
    goToEdit,
    hasPrev: Boolean(summary?.prevObjectId),
    hasNext: Boolean(summary?.nextObjectId),
  };
}
