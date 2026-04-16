'use client';

import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Copy, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  useObjectInfoHeader,
  type ObjectSummaryData,
  type DashboardIndicator,
  type IndicatorStatus,
} from '@/hooks/useObjectInfoHeader';
import { useToast } from '@/hooks/useToast';

interface Props {
  objectId: string;
}

// Форматирование рублей в млрд/млн/тыс
function formatRub(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} млрд`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} млн`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)} тыс`;
  return `${value.toFixed(0)} ₽`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

const STATUS_CONFIG: Record<IndicatorStatus, { bar: string; label: string; text: string }> = {
  OK: { bar: 'bg-green-500', label: 'В срок', text: 'text-green-600' },
  OVERDUE: { bar: 'bg-red-500', label: 'Просрочено', text: 'text-red-600' },
  AHEAD: { bar: 'bg-yellow-500', label: 'Перевыполнение', text: 'text-yellow-600' },
};

function IndicatorWidget({ label, data }: { label: string; data: DashboardIndicator }) {
  const cfg = STATUS_CONFIG[data.status];
  const today = new Date();
  const delta = data.factTotal - data.planToday;
  const sign = delta >= 0 ? '+' : '';

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <p className="text-xs text-muted-foreground truncate font-medium">{label}</p>

      {/* Факт / план */}
      <div className="flex items-baseline justify-between gap-1 min-w-0">
        <span className="text-sm font-bold truncate">{formatRub(data.factTotal)}</span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          из {formatRub(data.planTotal)}
        </span>
      </div>

      {/* Прогресс-бар */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${cfg.bar}`}
            style={{ width: `${Math.min(data.percent, 100)}%` }}
          />
        </div>
        <span className="text-xs font-medium tabular-nums shrink-0">{data.percent}%</span>
      </div>

      {/* План на сегодня */}
      {data.planToday > 0 && (
        <div className="space-y-0.5">
          <p className="text-[11px] text-muted-foreground">
            План на {formatDate(today)}:{' '}
            <span className="font-medium text-foreground">{formatRub(data.planToday)}</span>
          </p>
          <p className={`text-[11px] font-semibold ${cfg.text}`}>
            {cfg.label}{delta !== 0 ? ` (${sign}${formatRub(delta)})` : ''}
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
      <span className="text-muted-foreground whitespace-nowrap">{label}:</span>
      {children}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <span>
      <span className="text-muted-foreground">{label} </span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

interface ExpandedContentProps {
  summary: ObjectSummaryData;
  indicators: ReturnType<typeof useObjectInfoHeader>['indicators'];
}

function ExpandedContent({ summary, indicators }: ExpandedContentProps) {
  const { prescriptions, executionDocs, designDocs } = summary;

  return (
    <div className="space-y-3 pt-3">
      {/* 4 индикатора */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {indicators ? (
          <>
            <IndicatorWidget label="Выполнение по графикам" data={indicators.gprExec} />
            <IndicatorWidget label="Освоение по графикам ПИР" data={indicators.pirOsv} />
            <IndicatorWidget label="Освоение по графикам СМР (КС-2)" data={indicators.smrOsv} />
            <IndicatorWidget label="Оплачено по контрактам" data={indicators.payments} />
          </>
        ) : (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </>
        )}
      </div>

      <Separator />

      {/* Сводка */}
      <div className="space-y-1.5">
        <SummaryRow label="Предписания (шт)">
          <StatChip label="Активно" value={prescriptions.active} />
          <StatChip label="Закрыто" value={prescriptions.closed} />
        </SummaryRow>
        <SummaryRow label="ИД (компл)">
          <StatChip label="Замечания" value={executionDocs.rejected} />
          <StatChip label="На согласовании" value={executionDocs.inReview} />
          <StatChip label="На подписании" value={executionDocs.draft} />
          <StatChip label="Подписанные" value={executionDocs.signed} />
        </SummaryRow>
        <SummaryRow label="Проектная документация (компл)">
          <StatChip label="Замечания" value={designDocs.withComments} />
          <StatChip label="На согласовании" value={designDocs.inApproval} />
          <StatChip label="На подписании" value={designDocs.reviewPassed} />
          <StatChip label="Подписанные" value={designDocs.approved} />
        </SummaryRow>
      </div>
    </div>
  );
}

export function ObjectInfoHeader({ objectId }: Props) {
  const { toast } = useToast();
  const {
    isExpanded,
    toggle,
    summary,
    indicators,
    isLoading,
    goToPrev,
    goToNext,
    goToEdit,
    hasPrev,
    hasNext,
  } = useObjectInfoHeader(objectId);

  const objectName = summary?.object.name ?? '…';
  const objectAddress = summary?.object.address;

  return (
    <div className="mb-4 rounded-lg border bg-background px-4 py-3 shadow-sm">
      {/* Строка шапки */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base leading-tight truncate">{objectName}</p>
          {objectAddress && (
            <p className="text-xs text-muted-foreground truncate">{objectAddress}</p>
          )}
        </div>

        {/* Кнопки действий */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Копировать объект"
            onClick={() => toast({ title: 'Функция в разработке' })}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Редактировать"
            onClick={goToEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Предыдущий объект"
            onClick={goToPrev}
            disabled={!hasPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Следующий объект"
            onClick={goToNext}
            disabled={!hasNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title={isExpanded ? 'Свернуть' : 'Развернуть'}
            onClick={toggle}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Развёрнутая область */}
      {isExpanded && (
        isLoading ? (
          <div className="space-y-2 pt-3">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
            <Separator />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : summary ? (
          <ExpandedContent summary={summary} indicators={indicators} />
        ) : null
      )}
    </div>
  );
}
