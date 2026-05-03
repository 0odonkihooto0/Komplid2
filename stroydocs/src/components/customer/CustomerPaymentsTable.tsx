'use client';

import { useState } from 'react';
import { FeatureGate } from '@/components/subscriptions/FeatureGate';
import { PaywallBanner } from '@/components/subscriptions/PaywallBanner';
import { FEATURE_CODES } from '@/lib/features/codes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCustomerPayments } from './useCustomerPayments';

interface Props {
  projectId: string;
}

// Форма добавления новой оплаты (встроенная в таблицу)
function AddPaymentForm({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { create, isCreating } = useCustomerPayments(projectId);
  const [form, setForm] = useState({ category: '', amountRub: '', date: '', description: '' });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create(
      { ...form, amountRub: Number(form.amountRub) },
      { onSuccess: onClose },
    );
  }

  return (
    <tr>
      <td colSpan={5} className="px-3 py-2 bg-muted/40">
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
          <Input placeholder="Дата (ГГГГ-ММ-ДД)" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-36" required />
          <Input placeholder="Описание" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-48" required />
          <Input placeholder="Категория" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-32" required />
          <Input type="number" placeholder="Сумма (руб)" value={form.amountRub} onChange={e => setForm(f => ({ ...f, amountRub: e.target.value }))} className="w-32" required />
          <Button type="submit" size="sm" disabled={isCreating}>Сохранить</Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Отмена</Button>
        </form>
      </td>
    </tr>
  );
}

function PaymentsContent({ projectId }: Props) {
  const { payments, total, isLoading } = useCustomerPayments(projectId);
  const [showForm, setShowForm] = useState(false);

  // Итоговая сумма всех платежей
  const grandTotal = payments.reduce((sum, p) => sum + p.amountRub, 0);

  if (isLoading) return <p className="text-sm text-muted-foreground">Загрузка...</p>;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Всего платежей: {total}</p>
        <Button size="sm" onClick={() => setShowForm(v => !v)}>Добавить оплату</Button>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2">Дата</th>
              <th className="text-left px-3 py-2">Описание</th>
              <th className="text-left px-3 py-2">Категория</th>
              <th className="text-right px-3 py-2">Сумма, ₽</th>
              <th className="text-center px-3 py-2">Статус</th>
            </tr>
          </thead>
          <tbody>
            {showForm && <AddPaymentForm projectId={projectId} onClose={() => setShowForm(false)} />}
            {payments.map(p => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">{p.date}</td>
                <td className="px-3 py-2">{p.description}</td>
                <td className="px-3 py-2">{p.category}</td>
                <td className="px-3 py-2 text-right">{p.amountRub.toLocaleString('ru-RU')}</td>
                <td className="px-3 py-2 text-center">
                  <Badge variant={p.isPaid ? 'success' : 'warning'}>{p.isPaid ? 'Оплачено' : 'Ожидает'}</Badge>
                </td>
              </tr>
            ))}
            {payments.length === 0 && !showForm && (
              <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">Платежей нет</td></tr>
            )}
          </tbody>
          <tfoot className="border-t bg-muted/30 font-medium">
            <tr>
              <td colSpan={3} className="px-3 py-2">Итого</td>
              <td className="px-3 py-2 text-right">{grandTotal.toLocaleString('ru-RU')}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function CustomerPaymentsTable({ projectId }: Props) {
  return (
    <FeatureGate
      feature={FEATURE_CODES.CUSTOMER_PAYMENT_TRACKER}
      fallback={<PaywallBanner feature={FEATURE_CODES.CUSTOMER_PAYMENT_TRACKER} />}
    >
      <PaymentsContent projectId={projectId} />
    </FeatureGate>
  );
}
