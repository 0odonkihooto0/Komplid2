'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DataTable } from '@/components/shared/DataTable';
import { useAdminPromoCodes, useCreatePromoCode, useDeactivatePromoCode } from '@/hooks/useAdminPromoCodes';
import { toast } from '@/hooks/useToast';
import { formatDate } from '@/utils/format';
import type { ColumnDef } from '@tanstack/react-table';
import type { DiscountType } from '@prisma/client';
import Link from 'next/link';

const DISCOUNT_LABELS: Record<string, string> = {
  PERCENT: '%', FIXED_AMOUNT: '₽', TRIAL_DAYS: 'дней триала', FREE_MONTHS: 'мес. бесплатно',
};

interface PromoRow {
  id: string; code: string; discountType: DiscountType; discountValue: number;
  redemptionsCount: number; maxTotalRedemptions: number | null;
  validUntil: string | null; isActive: boolean;
  createdByUser: { email: string } | null;
}

export default function AdminPromoCodesPage() {
  const { data: codes = [], isLoading } = useAdminPromoCodes();
  const createMutation = useCreatePromoCode();
  const deactivateMutation = useDeactivatePromoCode();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ code: '', discountType: 'PERCENT' as DiscountType, discountValue: '10', maxRedemptions: '', validUntil: '' });

  async function handleCreate() {
    try {
      await createMutation.mutateAsync({
        code: form.code,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxTotalRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
        validUntil: form.validUntil || undefined,
      });
      toast({ title: 'Промокод создан' });
      setCreateOpen(false);
      setForm({ code: '', discountType: 'PERCENT', discountValue: '10', maxRedemptions: '', validUntil: '' });
    } catch (e) {
      toast({ title: 'Ошибка', description: String(e), variant: 'destructive' });
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await deactivateMutation.mutateAsync(id);
      toast({ title: 'Промокод деактивирован' });
    } catch (e) {
      toast({ title: 'Ошибка', description: String(e), variant: 'destructive' });
    }
  }

  const columns: ColumnDef<PromoRow>[] = [
    { accessorKey: 'code', header: 'Код' },
    { accessorKey: 'discountType', header: 'Тип', cell: ({ row }) => DISCOUNT_LABELS[row.original.discountType] ?? row.original.discountType },
    { id: 'discount', header: 'Значение', cell: ({ row }) => `${row.original.discountValue} ${DISCOUNT_LABELS[row.original.discountType] ?? ''}` },
    { id: 'usage', header: 'Использований', cell: ({ row }) => `${row.original.redemptionsCount} / ${row.original.maxTotalRedemptions ?? '∞'}` },
    { accessorKey: 'validUntil', header: 'Истекает', cell: ({ row }) => row.original.validUntil ? formatDate(row.original.validUntil) : 'Бессрочно' },
    { id: 'status', header: 'Статус', cell: ({ row }) => <Badge variant={row.original.isActive ? 'default' : 'destructive'}>{row.original.isActive ? 'Активен' : 'Истёк'}</Badge> },
    { id: 'actions', header: '', cell: ({ row }) => row.original.isActive ? (
      <Button size="sm" variant="outline" onClick={() => handleDeactivate(row.original.id)}>Деактивировать</Button>
    ) : null },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild><Link href="/admin/billing">← Биллинг</Link></Button>
          <h1 className="text-2xl font-semibold">Промокоды</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Создать промокод</Button>
      </div>

      {isLoading ? <p className="text-muted-foreground text-sm">Загрузка…</p> : (
        <DataTable columns={columns} data={codes as PromoRow[]} />
      )}

      {/* Диалог создания промокода */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Новый промокод</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Код</Label><Input placeholder="PROMO2026" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
            <div>
              <Label>Тип скидки</Label>
              <Select value={form.discountType} onValueChange={(v) => setForm({ ...form, discountType: v as DiscountType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENT">Процент (%)</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Фиксированная (₽)</SelectItem>
                  <SelectItem value="TRIAL_DAYS">Дни триала</SelectItem>
                  <SelectItem value="FREE_MONTHS">Бесплатные месяцы</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Значение</Label><Input type="number" min={1} value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} /></div>
            <div><Label>Макс. использований (опц.)</Label><Input type="number" min={1} value={form.maxRedemptions} onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })} /></div>
            <div><Label>Действует до (опц.)</Label><Input type="datetime-local" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending || !form.code}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
