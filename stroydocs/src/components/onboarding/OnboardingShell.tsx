'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingProgress } from './OnboardingProgress';

interface OnboardingShellProps {
  step: number;
  totalSteps?: number;
  canSkip?: boolean;
  skipTo?: string;
  children: ReactNode;
}

export function OnboardingShell({
  step,
  totalSteps = 5,
  canSkip = false,
  skipTo,
  children,
}: OnboardingShellProps) {
  const router = useRouter();

  const handleSkip = () => {
    if (skipTo) router.push(skipTo);
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-8 flex items-center justify-between">
        <OnboardingProgress current={step} total={totalSteps} />
        {canSkip && skipTo && (
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Пропустить
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
