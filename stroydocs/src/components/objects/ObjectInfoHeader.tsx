'use client';

import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Copy, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useObjectInfoHeader, type ObjectSummaryData } from '@/hooks/useObjectInfoHeader';
import { useToast } from '@/hooks/useToast';

interface Props {
  objectId: string;
}

// Форматирование рублей (без копеек)
const rub = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

function MiniWidget({
  label,
  value,
  total,
  percent,
  isCounts,
}: {
  label: string;
  value: number;
  total: number;
  percent: number;
  isCounts?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-1">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className="text-sm font-semibold leading-tight">
        {isCounts ? `${value} / ${total} компл` : `${rub.format(value)} / ${rub.format(total)}`}
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
        <span className="text-xs font-medium tabular-nums">{percent}%</span>
      </div>
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

function ExpandedContent({ summary }: { summary: ObjectSummaryData }) {
  const { contracts, gpr, pir, smr, prescriptions, executionDocs, designDocs } = summary;
  return (
    <div className="space-y-3 pt-3">
      {/* 4 мини-виджета */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MiniWidget
          label="Оплачено по контрактам"
          value={contracts.paidAmount}
          total={contracts.totalAmount}
          percent={contracts.percent}
        />
        <MiniWidget
          label="Выполнение по графикам"
          value={gpr.completedAmount}
          total={gpr.totalAmount}
          percent={gpr.percent}
        />
        <MiniWidget
          label="Освоение ПИР"
          value={pir.completed}
          total={pir.total}
          percent={pir.percent}
          isCounts
        />
        <MiniWidget
          label="Освоение СМР (КС-2)"
          value={smr.completedAmount}
          total={smr.totalAmount}
          percent={smr.percent}
        />
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
  const { isExpanded, toggle, summary, isLoading, goToPrev, goToNext, goToEdit, hasPrev, hasNext } =
    useObjectInfoHeader(objectId);

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
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
            <Separator />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : summary ? (
          <ExpandedContent summary={summary} />
        ) : null
      )}
    </div>
  );
}
