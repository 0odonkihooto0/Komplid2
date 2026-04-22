'use client';

import { useState } from 'react';
import { CancellationReasonCode } from '@prisma/client';
import { ReasonForm } from './ReasonForm';
import { RetentionOffer } from './RetentionOffer';
import { ConfirmCancellation } from './ConfirmCancellation';

// Причины, для которых показывается retention-оффер (шаг 2)
const REASONS_WITH_OFFER: CancellationReasonCode[] = [
  'TOO_EXPENSIVE',
  'NOT_USING',
  'MISSING_FEATURES',
];

interface Props {
  subscriptionId: string;
  effectiveEndDate: string;
}

export function CancelFlow({ subscriptionId, effectiveEndDate }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reason, setReason] = useState<CancellationReasonCode | null>(null);
  const [feedback, setFeedback] = useState<string | undefined>(undefined);
  const [retentionAccepted, setRetentionAccepted] = useState(false);

  const STEPS = ['Причина', 'Предложение', 'Подтверждение'];

  const handleReasonNext = (r: CancellationReasonCode, fb?: string) => {
    setReason(r);
    setFeedback(fb);
    if (REASONS_WITH_OFFER.includes(r)) {
      setStep(2);
    } else {
      setStep(3);
    }
  };

  const handleRetentionAccepted = () => {
    setRetentionAccepted(true);
  };

  if (retentionAccepted) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-4xl">🎉</div>
        <h2 className="text-lg font-semibold">Предложение принято!</h2>
        <p className="text-sm text-muted-foreground">
          Спасибо, что остаётесь с нами. Хорошего рабочего дня!
        </p>
        <a
          href="/settings/subscription"
          className="block w-full text-center rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          К настройкам подписки
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Индикатор прогресса */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          const active = step === n;
          const done = step > n;
          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-colors ${
                  done
                    ? 'bg-primary text-primary-foreground'
                    : active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {done ? '✓' : n}
              </div>
              <span
                className={`text-xs ${active ? 'font-medium' : 'text-muted-foreground'}`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px bg-border w-6" />
              )}
            </div>
          );
        })}
      </div>

      {step === 1 && <ReasonForm onNext={handleReasonNext} />}

      {step === 2 && reason && (
        <RetentionOffer
          subscriptionId={subscriptionId}
          reason={reason}
          onAccepted={handleRetentionAccepted}
          onDecline={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <ConfirmCancellation
          subscriptionId={subscriptionId}
          reason={reason}
          feedback={feedback}
          effectiveEndDate={effectiveEndDate}
          onBack={() => setStep(reason && REASONS_WITH_OFFER.includes(reason) ? 2 : 1)}
        />
      )}
    </div>
  );
}
