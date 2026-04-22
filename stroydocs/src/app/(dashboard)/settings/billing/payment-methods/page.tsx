import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { PaymentMethodsManager } from '@/components/billing/PaymentMethodsManager';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PaymentMethodsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const workspaceId = session.user.activeWorkspaceId;
  if (!workspaceId) redirect('/settings/subscription');

  const methods = await db.paymentMethod.findMany({
    where: { workspaceId, isActive: true },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/settings/billing">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Способы оплаты</h1>
          <p className="text-muted-foreground mt-0.5">Управление сохранёнными картами</p>
        </div>
      </div>

      <PaymentMethodsManager initialMethods={methods} />

      <p className="text-sm text-muted-foreground">
        Карта сохраняется автоматически при оплате подписки через ЮKassa.
      </p>
    </div>
  );
}
