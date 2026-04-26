'use client';

import { useState, type ReactNode } from 'react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { PaywallModal } from './PaywallModal';
import type { FeatureCode } from '@/lib/features/codes';

interface Props {
  feature: FeatureCode;
  /**
   * soft — показать PaywallModal при попытке взаимодействия (дети видны, но заблокированы)
   * hard — скрыть children полностью
   * ReactNode — кастомный fallback-элемент
   */
  fallback?: 'soft' | 'hard' | ReactNode;
  children: ReactNode;
}

export function PaywallGate({ feature, fallback = 'soft', children }: Props) {
  const { hasAccess, isLoading, planName, planCode } = useFeatureAccess(feature);
  const [modalOpen, setModalOpen] = useState(false);

  if (isLoading) return null;

  if (hasAccess) return <>{children}</>;

  // Кастомный ReactNode-фолбэк
  if (fallback !== 'soft' && fallback !== 'hard') {
    return <>{fallback}</>;
  }

  // hard — вообще не рендерим
  if (fallback === 'hard') return null;

  // soft — рендерим children в заблокированной обёртке + модалка при клике
  return (
    <>
      <div
        className="relative cursor-pointer select-none"
        onClick={() => setModalOpen(true)}
        role="button"
        aria-label="Функция недоступна. Нажмите для подробностей"
      >
        <div className="pointer-events-none opacity-40">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center rounded-md bg-background/60 backdrop-blur-[1px]" />
      </div>

      <PaywallModal
        feature={feature}
        planName={planName}
        planCode={planCode}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
