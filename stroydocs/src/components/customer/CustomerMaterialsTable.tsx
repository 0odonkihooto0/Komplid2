'use client';

import { useState } from 'react';
import { FeatureGate } from '@/components/subscriptions/FeatureGate';
import { PaywallBanner } from '@/components/subscriptions/PaywallBanner';
import { FEATURE_CODES } from '@/lib/features/codes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCustomerMaterials } from './useCustomerMaterials';

interface Props {
  projectId: string;
}

// Форма добавления нового материала (встроенная в таблицу)
function AddMaterialForm({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { create, isCreating } = useCustomerMaterials(projectId);
  const [form, setForm] = useState({ name: '', unit: '', quantity: '', priceRub: '', supplier: '' });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create(
      { ...form, quantity: Number(form.quantity), priceRub: Number(form.priceRub) },
      { onSuccess: onClose },
    );
  }

  return (
    <tr>
      <td colSpan={6} className="px-3 py-2 bg-muted/40">
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
          <Input placeholder="Название" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-40" required />
          <Input placeholder="Ед.изм." value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="w-20" required />
          <Input type="number" placeholder="Кол-во" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="w-24" required />
          <Input type="number" placeholder="Цена, ₽" value={form.priceRub} onChange={e => setForm(f => ({ ...f, priceRub: e.target.value }))} className="w-28" required />
          <Input placeholder="Поставщик" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className="w-36" />
          <Button type="submit" size="sm" disabled={isCreating}>Сохранить</Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Отмена</Button>
        </form>
      </td>
    </tr>
  );
}

function MaterialsContent({ projectId }: Props) {
  const { materials, total, isLoading } = useCustomerMaterials(projectId);
  const [showForm, setShowForm] = useState(false);

  // Итоговая стоимость всех материалов
  const grandTotal = materials.reduce((sum, m) => sum + m.totalRub, 0);

  if (isLoading) return <p className="text-sm text-muted-foreground">Загрузка...</p>;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Всего позиций: {total}</p>
        <Button size="sm" onClick={() => setShowForm(v => !v)}>Добавить материал</Button>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2">Название</th>
              <th className="text-left px-3 py-2">Ед.изм.</th>
              <th className="text-right px-3 py-2">Кол-во</th>
              <th className="text-right px-3 py-2">Цена/ед, ₽</th>
              <th className="text-right px-3 py-2">Итого, ₽</th>
              <th className="text-left px-3 py-2">Поставщик</th>
            </tr>
          </thead>
          <tbody>
            {showForm && <AddMaterialForm projectId={projectId} onClose={() => setShowForm(false)} />}
            {materials.map(m => (
              <tr key={m.id} className="border-t">
                <td className="px-3 py-2">{m.name}</td>
                <td className="px-3 py-2">{m.unit}</td>
                <td className="px-3 py-2 text-right">{m.quantity}</td>
                <td className="px-3 py-2 text-right">{m.priceRub.toLocaleString('ru-RU')}</td>
                <td className="px-3 py-2 text-right">{m.totalRub.toLocaleString('ru-RU')}</td>
                <td className="px-3 py-2 text-muted-foreground">{m.supplier ?? '—'}</td>
              </tr>
            ))}
            {materials.length === 0 && !showForm && (
              <tr><td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">Материалов нет</td></tr>
            )}
          </tbody>
          <tfoot className="border-t bg-muted/30 font-medium">
            <tr>
              <td colSpan={4} className="px-3 py-2">Итого</td>
              <td className="px-3 py-2 text-right">{grandTotal.toLocaleString('ru-RU')}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function CustomerMaterialsTable({ projectId }: Props) {
  return (
    <FeatureGate
      feature={FEATURE_CODES.CUSTOMER_MATERIALS_TRACKER}
      fallback={<PaywallBanner feature={FEATURE_CODES.CUSTOMER_MATERIALS_TRACKER} />}
    >
      <MaterialsContent projectId={projectId} />
    </FeatureGate>
  );
}
