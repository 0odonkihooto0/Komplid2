'use client';

interface OnboardingProgressProps {
  current: number;
  total: number;
}

const STEP_LABELS: Record<number, string> = {
  1: 'Роль',
  2: 'Пространство',
  3: 'Тариф',
  4: 'Команда',
  5: 'Проект',
};

export function OnboardingProgress({ current, total }: OnboardingProgressProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isCompleted = step < current;
        const isCurrent = step === current;
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={[
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors',
                isCompleted ? 'bg-primary text-primary-foreground' : '',
                isCurrent ? 'border-2 border-primary text-primary' : '',
                !isCompleted && !isCurrent ? 'border border-muted-foreground/30 text-muted-foreground' : '',
              ].join(' ')}
            >
              {isCompleted ? '✓' : step}
            </div>
            <span
              className={[
                'hidden text-xs sm:inline',
                isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground',
              ].join(' ')}
            >
              {STEP_LABELS[step]}
            </span>
            {step < total && (
              <div className={['h-px w-6 sm:w-10', isCompleted ? 'bg-primary' : 'bg-muted-foreground/20'].join(' ')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
