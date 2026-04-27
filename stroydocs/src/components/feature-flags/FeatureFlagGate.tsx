'use client';

import type { ReactNode } from 'react';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

interface Props {
  flag: string;
  /** Что показывать, если флаг выключен (default: null — скрыть полностью) */
  fallback?: ReactNode;
  children: ReactNode;
}

// Gate компонент для runtime feature-flags (A/B-тесты, rollout, kill-switch).
// Для подписочных gates используй PaywallGate.
export function FeatureFlagGate({ flag, fallback = null, children }: Props) {
  const { enabled, isLoading } = useFeatureFlag(flag);

  // Пока загружается — показываем fallback (безопасно: нет flash нового UI)
  if (isLoading || !enabled) return <>{fallback}</>;
  return <>{children}</>;
}
