import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export async function BillingStatusBanner() {
  const session = await getServerSession(authOptions);
  const workspaceId = session?.user?.activeWorkspaceId;
  if (!workspaceId) return null;

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      activeSubscription: {
        include: { defaultPaymentMethod: true },
      },
    },
  });

  const sub = workspace?.activeSubscription;
  if (!sub) return null;

  // Показываем баннер только для PAST_DUE и GRACE
  if (sub.status !== 'PAST_DUE' && sub.status !== 'GRACE') return null;

  if (sub.status === 'PAST_DUE') {
    const card = sub.defaultPaymentMethod;
    const last4 = card?.cardLast4 ? `•${card.cardLast4}` : '';
    return (
      <div className="bg-red-50 border-b border-red-200 px-6 py-2 flex items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>Автосписание не прошло.</strong>
            {` Попытка ${sub.dunningAttempts} из 5.`}
            {last4 && ` Карта ${last4} отклонена банком.`}
            {` Обновите способ оплаты, чтобы не потерять доступ.`}
          </span>
        </div>
        <Link
          href="/settings/billing/payment-methods"
          className="flex-shrink-0 text-red-700 font-medium underline underline-offset-2 hover:text-red-900 whitespace-nowrap"
        >
          Обновить →
        </Link>
      </div>
    );
  }

  // GRACE
  const graceUntil = sub.graceUntil;
  const daysLeft = graceUntil
    ? Math.max(0, Math.ceil((graceUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between gap-4 text-sm">
      <div className="flex items-center gap-2 text-amber-900">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span>
          <strong>Подписка закончилась. Режим только для чтения.</strong>
          {daysLeft !== null && ` Осталось ${daysLeft} дн. для восстановления.`}
        </span>
      </div>
      <Link
        href="/settings/subscription"
        className="flex-shrink-0 text-amber-800 font-medium underline underline-offset-2 hover:text-amber-950 whitespace-nowrap"
      >
        Восстановить доступ →
      </Link>
    </div>
  );
}
