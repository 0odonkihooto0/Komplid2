'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { OrgSearchInput } from '@/components/modules/land-plots/OrgSearchInput';
import type { SupplierOrderCardData } from './useSupplierOrderCard';
import { useWarehouses, DELIVERY_CONDITION_LABELS } from './useSupplierOrderCard';
import type { DeliveryCondition } from './useSupplierOrderCard';
import { useSupplierOrderDocForm } from './useSupplierOrderDocForm';

interface Props {
  objectId: string;
  order: SupplierOrderCardData;
}

const DELIVERY_CONDITIONS = Object.keys(DELIVERY_CONDITION_LABELS) as DeliveryCondition[];

export function SupplierOrderDocTab({ objectId, order }: Props) {
  const { warehouses } = useWarehouses(objectId);
  const form = useSupplierOrderDocForm(objectId, order);

  return (
    <div className="space-y-6 pt-3 max-w-2xl">
      {/* Стороны */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Стороны</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <OrgSearchInput
            label="Исполнитель (поставщик)"
            initialName={form.supplierOrgName}
            onSelect={(id, name) => { form.setSupplierOrgId(id); form.setSupplierOrgName(name); }}
          />
          <OrgSearchInput
            label="Заказчик"
            initialName={form.customerOrgName}
            onSelect={(id, name) => { form.setCustomerOrgId(id); form.setCustomerOrgName(name); }}
          />
        </div>
      </section>

      {/* Склад и поставка */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Склад и поставка</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Склад-получатель</Label>
            <Select value={form.warehouseId || 'NONE'} onValueChange={(v) => form.setWarehouseId(v === 'NONE' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Выберите склад..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">— Не указан —</SelectItem>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}{w.isDefault && ' (основной)'}{w.location ? ` — ${w.location}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="doc-delivery-date">Дата поставки</Label>
            <Input id="doc-delivery-date" type="date" value={form.deliveryDate} onChange={(e) => form.setDeliveryDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="doc-ext-number">Внешний номер</Label>
            <Input id="doc-ext-number" placeholder="Номер в системе поставщика" value={form.externalNumber} onChange={(e) => form.setExternalNumber(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Условия поставки</Label>
            <Select value={form.deliveryConditions} onValueChange={form.setDeliveryConditions}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DELIVERY_CONDITIONS.map((cond) => (
                  <SelectItem key={cond} value={cond}>{DELIVERY_CONDITION_LABELS[cond]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="doc-contract-type">Тип контракта</Label>
            <Input id="doc-contract-type" placeholder="Например: Рамочный, Разовый..." value={form.contractType} onChange={(e) => form.setContractType(e.target.value)} />
          </div>
        </div>
      </section>

      {/* Готовность */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Готовность</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="doc-underdelivery">Дата готовности недопоставленного</Label>
            <Input id="doc-underdelivery" type="date" value={form.underdeliveryDate} onChange={(e) => form.setUnderdeliveryDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="doc-correction">Коррекция даты готовности</Label>
            <Input id="doc-correction" type="date" value={form.readinessCorrectionDate} onChange={(e) => form.setReadinessCorrectionDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="doc-expected-ready">Ожидаемая дата готовности</Label>
            <Input id="doc-expected-ready" type="date" value={form.expectedReadyDate} onChange={(e) => form.setExpectedReadyDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="doc-expected-arrival">Ожидаемая дата прибытия</Label>
            <Input id="doc-expected-arrival" type="date" value={form.expectedArrivalDate} onChange={(e) => form.setExpectedArrivalDate(e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="doc-readiness-through">Готовность через</Label>
            <Input id="doc-readiness-through" placeholder="Например: 14 рабочих дней" value={form.readinessThrough} onChange={(e) => form.setReadinessThrough(e.target.value)} />
          </div>
        </div>
      </section>

      {/* Прочее */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Прочее</h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="doc-construction-object">Объект строительства</Label>
            <Input id="doc-construction-object" placeholder="Наименование объекта" value={form.constructionObject} onChange={(e) => form.setConstructionObject(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="doc-notes">Примечание</Label>
            <Textarea id="doc-notes" placeholder="Необязательно" rows={3} value={form.notes} onChange={(e) => form.setNotes(e.target.value)} />
          </div>
        </div>
      </section>

      <Button size="sm" onClick={form.handleSave} disabled={form.isSaving}>
        {form.isSaving ? 'Сохранение...' : 'Сохранить'}
      </Button>

      {/* Мета-информация */}
      <div className="text-xs text-muted-foreground space-y-0.5 pt-2 border-t">
        <p>
          Создан:{' '}
          {format(new Date(order.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}
          {order.createdBy && ` · ${order.createdBy.firstName} ${order.createdBy.lastName}`}
        </p>
      </div>
    </div>
  );
}
