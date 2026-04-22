import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { db } from '@/lib/db';
import { PaymentsTable } from '@/components/billing/PaymentsTable';
import { PaymentsFilterBar } from '@/components/billing/PaymentsFilterBar';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { Prisma, PaymentStatus, PaymentType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; period?: string; page?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const workspaceId = session.user.activeWorkspaceId;
  if (!workspaceId) redirect('/settings/subscription');

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10));
  const limit = 50;

  // Построение where-условия для фильтров
  const where: Prisma.PaymentWhereInput = { workspaceId };

  if (sp.status && sp.status !== 'ALL') {
    where.status = sp.status as PaymentStatus;
  }
  if (sp.type && sp.type !== 'ALL') {
    where.type = sp.type as PaymentType;
  }
  if (sp.period && sp.period !== 'all') {
    const now = new Date();
    const periodStart: Record<string, Date> = {
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '3m': new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
      '1y': new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
    };
    if (periodStart[sp.period]) {
      where.createdAt = { gte: periodStart[sp.period] };
    }
  }

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where,
      include: {
        receipt: true,
        subscription: { include: { plan: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    }),
    db.payment.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-8 px-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/settings/billing">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">История платежей</h1>
          <p className="text-muted-foreground mt-0.5">Все транзакции и чеки</p>
        </div>
      </div>

      <Suspense fallback={<Skeleton className="h-12 w-full" />}>
        <PaymentsFilterBar currentFilters={sp} />
      </Suspense>

      <PaymentsTable payments={payments} />

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Страница {page} из {totalPages} &middot; Всего {total} платежей
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={`?${new URLSearchParams({ ...sp, page: String(page - 1) })}`}>
                  Назад
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button asChild variant="outline" size="sm">
                <Link href={`?${new URLSearchParams({ ...sp, page: String(page + 1) })}`}>
                  Вперёд
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
