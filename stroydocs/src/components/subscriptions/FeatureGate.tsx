'use client';

import type { ReactNode } from 'react';
import { useFeature } from '@/hooks/use-feature';
import { PaywallBanner } from './PaywallBanner';
import type { FeatureCode } from '@/lib/features/codes';

interface Props {
  feature: FeatureCode;
  fallback?: ReactNode;
  children: ReactNode;
}

export function FeatureGate({ feature, fallback, children }: Props) {
  const { hasAccess, isLoading } = useFeature(feature);
  if (isLoading) return null;
  if (hasAccess) return <>{children}</>;
  return <>{fallback ?? <PaywallBanner feature={feature} />}</>;
}
