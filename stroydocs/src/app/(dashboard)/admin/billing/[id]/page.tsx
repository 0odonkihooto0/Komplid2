'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminSubscription, useExtendSubscription, useCancelSubscription, useRefundPayment } from '@/hooks/useAdminBillingSubscriptions';
import { toast } from '@/hooks/useToast';
import { formatDate, formatDateTime } from '@/utils/format';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активна', TRIALING: 'Триал', PAST_DUE: 'Просрочена',
  GRACE: 'Grace', CANCELLED: 'Отменена', EXPIRED: 'Истекла', PAUSED: 'Пауза',
};

const EVENT_LABELS: Record<string, string> = {
  CREATED: 'Создана', TRIAL_STARTED: 'Триал начат', TRIAL_CONVERTED: 'Конвертирован',
  RENEWED: 'Продлена', RENEWAL_FAILED: 'Ошибка продления', UPGRADED: 'Апгрейд',
  DOWNGRADED: 'Даунгрейд', CANCELLED: 'Отменена', REACTIVATED: 'Восстановлена',
  EXPIRED: 'Истекла', GRACE_STARTED: 'Grace период', DUNNING_START: 'Dunning запущен',
  DUNNING_RESOLVED: 'Dunning завершён', DUNNING_FAILED: 'Dunning провален',
  MANUAL_EXTENSION: 'Ручное продление', PROMO_APPLIED: 'Промокод применён',
};

export default function AdminBillingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: sub, isLoading } = useAdminSubscription(id);
  const extend = useExtendSubscription(id);
  const cancel = useCancelSubscription(id);
  const refund = useRefundPayment(id);

  const [extendDays, setExtendDays] = useState('7');
  const [extendOpen, setExtendOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');

  if (isLoading) return <div className="p-6 text-muted-foreground">Загрузка…</div>;
  if (!sub) return <div className="p-6 text-muted-foreground">Подписка не найдена</div>;

  async function handleExtend() {
    try {
      await extend.mutateAsync(Number(extendDays));
      toast({ title: `Подписка продлена на ${extendDays} дней` });
      setExtendOpen(false);
    } catch (e) {
      toast({ title: 'Ошибка продления', description: String(e), variant: 'destructive' });
    }
  }

  async function handleCancel() {
    try {
      await cancel.mutateAsync();
      toast({ title: 'Подписка отменена' });
    } catch (e) {
      toast({ title: 'Ошибка отмены', description: String(e), variant: 'destructive' });
    }
  }

  async function handleRefund() {
    try {
      await refund.mutateAsync({ paymentId: selectedPaymentId, amountRub: Math.round(Number(refundAmount) * 100) });
      toast({ title: 'Возврат выполнен' });
      setRefundOpen(false);
    } catch (e) {
      toast({ title: 'Ошибка возврата', description: String(e), variant: 'destructive' });
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild><Link href="/admin/billing">← Назад</Link></Button>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setExtendOpen(true)}>Продлить</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button size="sm" variant="outline">Отменить</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Отменить подписку?</AlertDialogTitle><AlertDialogDescription>Подписка будет немедленно отменена.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Нет</AlertDialogCancel><AlertDialogAction onClick={handleCancel}>Да, отменить</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Информация о подписке */}
      <Card>
        <CardHeader><CardTitle>Подписка</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Тариф:</span> {sub.plan?.name}</div>
          <div><span className="text-muted-foreground">Статус:</span> <Badge>{STATUS_LABELS[sub.status] ?? sub.status}</Badge></div>
          <div><span className="text-muted-foreground">Период:</span> {sub.billingPeriod === 'MONTHLY' ? 'Ежемесячно' : 'Ежегодно'}</div>
          <div><span className="text-muted-foreground">До:</span> {formatDate(sub.currentPeriodEnd)}</div>
          <div><span className="text-muted-foreground">Организация:</span> {sub.workspace?.organization?.name ?? '—'}</div>
          <div><span className="text-muted-foreground">Email:</span> {sub.workspace?.owner?.email}</div>
          {sub.dunningAttempts > 0 && <div><span className="text-muted-foreground">Попыток dunning:</span> {sub.dunningAttempts}</div>}
          {sub.graceUntil && <div><span className="text-muted-foreground">Grace до:</span> {formatDate(sub.graceUntil)}</div>}
        </CardContent>
      </Card>

      {/* Платежи */}
      {sub.payments?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Платежи</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-muted-foreground"><th className="text-left pb-2">Дата</th><th className="text-left pb-2">Сумма</th><th className="text-left pb-2">Статус</th><th /></tr></thead>
              <tbody>
                {sub.payments.map((p: { id: string; paidAt?: string; createdAt: string; amountRub: number; status: string }) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2">{formatDate(p.paidAt ?? p.createdAt)}</td>
                    <td className="py-2">{(p.amountRub / 100).toLocaleString('ru-RU')} ₽</td>
                    <td className="py-2">{p.status}</td>
                    <td className="py-2 text-right">
                      {p.status === 'SUCCEEDED' && (
                        <Button size="sm" variant="outline" onClick={() => { setSelectedPaymentId(p.id); setRefundAmount(String(p.amountRub / 100)); setRefundOpen(true); }}>Вернуть</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* История событий подписки */}
      {sub.events?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>История событий</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {sub.events.map((e: { id: string; type: string; createdAt: string; actorType: string; actorUser?: { email: string } }) => (
              <div key={e.id} className="flex gap-3 text-sm border-b pb-2 last:border-0">
                <span className="text-muted-foreground w-36 shrink-0">{formatDateTime(e.createdAt)}</span>
                <span className="font-medium">{EVENT_LABELS[e.type] ?? e.type}</span>
                <span className="text-muted-foreground">{e.actorUser?.email ?? e.actorType}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Диалог ручного продления */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Продлить подписку</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Количество дней</Label>
            <Input type="number" min={1} max={365} value={extendDays} onChange={(e) => setExtendDays(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendOpen(false)}>Отмена</Button>
            <Button onClick={handleExtend} disabled={extend.isPending}>Продлить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог возврата платежа */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Возврат платежа</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Сумма возврата (₽)</Label>
            <Input type="number" min={1} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>Отмена</Button>
            <Button onClick={handleRefund} disabled={refund.isPending}>Вернуть деньги</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
