'use client';

import { useState } from 'react';
import { ChevronDown, Pencil, Plus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { IndicatorsView } from './IndicatorsView';
import { AddIndicatorDialog } from './AddIndicatorDialog';
import { EditIndicatorDialog } from './EditIndicatorDialog';
import {
  useProjectIndicators,
  type ProjectIndicator,
  type PirContract,
  type TechnicalConditionSummary,
} from './useProjectIndicators';

const INDICATOR_GROUPS = [
  'Общая информация',
  'Градостроительная проработка',
  'Информация по СМР и АВР',
  'Структура капитальных затрат',
  'Статус реализации',
  'Контракты ПИР',
  'Данные по контрактам СК и СМР',
  'ТУ для строительства',
] as const;

// Форматирование суммы
function formatAmount(value: number | null): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value);
}

// Компонент одного показателя с hover-иконкой редактирования
function IndicatorRow({
  name, value, isAuto, onEdit,
}: {
  name: string;
  value: string;
  isAuto?: boolean;
  onEdit?: () => void;
}) {
  return (
    <div className="group flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{name}</span>
      <div className="flex shrink-0 items-center gap-2">
        {isAuto && <Zap className="h-3 w-3 text-green-500" aria-label="Автозаполнение" />}
        <span className="font-medium">{value || '—'}</span>
        {onEdit && (
          <button
            onClick={onEdit}
            className="opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="Редактировать"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

// Группа аккордеона
function IndicatorGroup({
  groupName,
  indicators,
  pirContracts,
  technicalConditions,
  onEditClick,
}: {
  groupName: string;
  indicators: ProjectIndicator[];
  pirContracts: PirContract[];
  technicalConditions: TechnicalConditionSummary[];
  onEditClick: (ind: ProjectIndicator) => void;
}) {
  const [open, setOpen] = useState(false);

  // Автозаполненные строки для специальных групп
  const autoRows: Array<{ name: string; value: string }> = [];
  if (groupName === 'Контракты ПИР' && pirContracts.length > 0) {
    const total = pirContracts.reduce((sum, c) => sum + (c.totalAmount ?? 0), 0);
    autoRows.push({ name: 'Количество контрактов ПИР', value: String(pirContracts.length) });
    autoRows.push({ name: 'Итоговая сумма контрактов ПИР', value: formatAmount(total) });
  }
  if (groupName === 'ТУ для строительства' && technicalConditions.length > 0) {
    for (const tc of technicalConditions) {
      autoRows.push({
        name: tc.type,
        value: tc.connectionAvailability ? 'Подключение доступно' : 'Подключение недоступно',
      });
    }
  }

  const totalCount = indicators.length + autoRows.length;

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{groupName}</span>
          {totalCount > 0 && (
            <Badge variant="secondary" className="text-xs">{totalCount}</Badge>
          )}
        </div>
        <ChevronDown
          className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="border-t px-4 pb-3">
          {totalCount === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">Показатели не добавлены</p>
          ) : (
            <div className="divide-y">
              {autoRows.map((row) => (
                <IndicatorRow key={row.name} name={row.name} value={row.value} isAuto />
              ))}
              {indicators.map((ind) => (
                <IndicatorRow
                  key={ind.id}
                  name={ind.indicatorName}
                  value={ind.value ?? ''}
                  onEdit={() => onEditClick(ind)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ProjectIndicatorsViewProps {
  projectId: string;
}

export function ProjectIndicatorsView({ projectId }: ProjectIndicatorsViewProps) {
  const { data, isLoading, createIndicator, updateIndicator, deleteIndicator, isPending } =
    useProjectIndicators(projectId);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<ProjectIndicator | null>(null);

  function handleEditClick(ind: ProjectIndicator) {
    setSelectedIndicator(ind);
    setEditOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Блок Сводка — старые KPI-карточки */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Сводка</h2>
        <IndicatorsView projectId={projectId} />
      </section>

      {/* Блок конфигурируемых показателей */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Показатели по группам</h2>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Добавить
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {INDICATOR_GROUPS.map((group) => (
              <IndicatorGroup
                key={group}
                groupName={group}
                indicators={data?.groups[group] ?? []}
                pirContracts={group === 'Контракты ПИР' ? (data?.pirContracts ?? []) : []}
                technicalConditions={
                  group === 'ТУ для строительства' ? (data?.technicalConditions ?? []) : []
                }
                onEditClick={handleEditClick}
              />
            ))}
          </div>
        )}
      </section>

      <AddIndicatorDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        isPending={isPending}
        onSubmit={(formData) => {
          createIndicator(formData);
          setAddOpen(false);
        }}
      />

      <EditIndicatorDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        indicator={selectedIndicator}
        isPending={isPending}
        onSave={(id, payload) => {
          updateIndicator({ id, payload });
          setEditOpen(false);
        }}
        onDelete={(id) => {
          deleteIndicator(id);
        }}
      />
    </div>
  );
}
