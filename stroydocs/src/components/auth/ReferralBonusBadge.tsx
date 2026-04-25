import { Gift } from 'lucide-react';

interface ReferralBonusBadgeProps {
  code: string;
}

export function ReferralBonusBadge({ code }: ReferralBonusBadgeProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-green-400/40 bg-green-500/15 px-4 py-3">
      <Gift className="h-5 w-5 shrink-0 text-green-300" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-green-200">
          По реферальной ссылке вы получаете 30 дней бесплатно
        </p>
        <p className="mt-0.5 text-xs text-green-300/70">
          Код: {code}
        </p>
      </div>
    </div>
  );
}
