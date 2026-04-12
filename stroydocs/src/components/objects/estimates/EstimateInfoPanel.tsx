'use client';

import { useRouter } from 'next/navigation';
import { Pencil, Eye, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/format';
import type { EstimateListItem } from './useEstimateList';

const VERSION_TYPE_LABELS: Record<string, string> = {
  BASELINE: 'Базовая',
  ACTUAL: 'Актуальная',
  CORRECTIVE: 'Корректировка',
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  OK: { label: 'OK', className: 'bg-green-100 text-green-800' },
  EDITING: { label: 'Редактируется', className: 'bg-yellow-100 text-yellow-800' },
  RECALCULATING: { label: 'Пересчёт', className: 'bg-blue-100 text-blue-800' },
  ERROR: { label: 'Ошибка', className: 'bg-red-100 text-red-800' },
};

const formatRub = (amount: number | null) => {
  if (amount === null) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
};

interface Props {
  item: EstimateListItem;
  objectId: string;
}

/** Информационная панель под строкой сметы при клике */
export function EstimateInfoPanel({ item, objectId }: Props) {
  const router = useRouter();
  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.OK;
  const versionUrl = `/objects/${objectId}/estimates/${item.id}?contractId=${item.contract.id}`;

  return (
    <div className="bg-muted/30 border-t px-6 py-4 space-y-3">
      {/* Реквизиты */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
        <InfoField label="Контракт" value={`${item.contract.number || ''} ${item.contract.name}`.trim()} />
        <InfoField label="Период" value={item.period ?? '—'} />
        <InfoField label="Дата создания" value={formatDate(item.createdAt)} />
        <InfoField label="Базовые цены" value={formatRub(item.totalAmount)} />
        <InfoField label="ФОТ" value={formatRub(item.totalLabor)} />
        <InfoField label="Материалы" value={formatRub(item.totalMat)} />
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Статус:</span>
          <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Тип:</span>
          <Badge variant="outline">{VERSION_TYPE_LABELS[item.versionType] ?? item.versionType}</Badge>
        </div>
        <InfoField
          label="Автор"
          value={`${item.createdBy.firstName} ${item.createdBy.lastName}`}
        />
      </div>

      {/* Кнопки действий */}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => router.push(versionUrl)}>
          <Pencil className="mr-2 h-4 w-4" />
          Редактировать
        </Button>
        <Button size="sm" variant="outline" onClick={() => router.push(versionUrl)}>
          <Eye className="mr-2 h-4 w-4" />
          Просмотр
        </Button>
        <Button size="sm" variant="outline" disabled={item.isBaseline}>
          <Upload className="mr-2 h-4 w-4" />
          Загрузить корректировку
        </Button>
      </div>

      {/* Корректировки */}
      {item._count.childVersions > 0 && (
        <div className="text-sm">
          <p className="font-medium text-muted-foreground">
            Корректировки: {item._count.childVersions}
          </p>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
