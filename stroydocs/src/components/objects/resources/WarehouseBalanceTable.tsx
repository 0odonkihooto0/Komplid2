'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WarehouseBalance {
  id: string;
  quantity: number;
  reservedQty: number;
  unit: string | null;
  nomenclature: {
    id: string;
    name: string;
    unit: string | null;
    category: string | null;
    vendorCode: string | null;
  };
}

interface WarehouseOption {
  id: string;
  name: string;
  isDefault: boolean;
  location: string | null;
}

interface Props {
  objectId: string;
}

export function WarehouseBalanceTable({ objectId }: Props) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');

  // Загружаем список складов объекта
  const { data: warehousesResp, isLoading: warehousesLoading } = useQuery<{ data: WarehouseOption[] }>({
    queryKey: ['warehouses', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/warehouses`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки складов');
      return json;
    },
  });
  const warehouses = warehousesResp?.data ?? [];

  // Инициализируем выбранный склад: сначала дефолтный, иначе первый в списке
  useEffect(() => {
    if (warehouses.length === 0) return;
    const defaultWarehouse = warehouses.find((w) => w.isDefault) ?? warehouses[0];
    setSelectedWarehouseId(defaultWarehouse.id);
  }, [warehouses]);

  // Загружаем остатки выбранного склада
  const { data: itemsResp, isLoading: itemsLoading } = useQuery<{ data: WarehouseBalance[] }>({
    queryKey: ['warehouse-items', selectedWarehouseId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/warehouses/${selectedWarehouseId}/items`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки остатков');
      return json;
    },
    enabled: !!selectedWarehouseId,
  });
  const items = itemsResp?.data ?? [];

  if (warehousesLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        Загрузка складов...
      </div>
    );
  }

  if (warehouses.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-center text-sm text-muted-foreground">
        Склады не найдены. Создайте склад во вкладке «Закупки».
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Выбор склада */}
      <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
        <SelectTrigger className="w-72">
          <SelectValue placeholder="Выберите склад..." />
        </SelectTrigger>
        <SelectContent>
          {warehouses.map((w) => (
            <SelectItem key={w.id} value={w.id}>
              {w.name}
              {w.isDefault && ' (основной)'}
              {w.location ? ` — ${w.location}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Таблица остатков */}
      {itemsLoading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Загрузка остатков...
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          На складе нет позиций
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground text-xs">
              <th className="pb-2 pr-4 font-medium">Номенклатура</th>
              <th className="pb-2 pr-4 font-medium text-right">Кол-во</th>
              <th className="pb-2 pr-4 font-medium text-right">Зарезервировано</th>
              <th className="pb-2 pr-4 font-medium text-right">Доступно</th>
              <th className="pb-2 font-medium">Ед.</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              // Доступно = количество минус зарезервированное
              const available = item.quantity - item.reservedQty;
              const unit = item.nomenclature.unit ?? item.unit ?? '—';
              return (
                <tr key={item.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 pr-4">{item.nomenclature.name}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{item.quantity}</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">
                    {item.reservedQty}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums font-medium">
                    {available}
                  </td>
                  <td className="py-2 text-muted-foreground">{unit}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
