'use client';

interface MetricCardProps {
  label: string;
  primary: string;
  secondary?: string;
}

function MetricCard({ label, primary, secondary }: MetricCardProps) {
  return (
    <div className="flex flex-col gap-1 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="text-2xl font-semibold leading-none">{primary}</p>
      {secondary && (
        <p className="text-[12px] text-muted-foreground">{secondary}</p>
      )}
    </div>
  );
}

interface ObjectMetricsProps {
  stage: { name: string; order: number; total: number } | null;
  gprProgress: number | null;
  budget: number | null;
  plannedEndDate: string | null;
}

function formatBudget(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} млрд ₽`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} млн ₽`;
  }
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value);
}

export function ObjectMetrics({ stage, gprProgress, budget, plannedEndDate }: ObjectMetricsProps) {
  const budgetLabel = budget != null ? formatBudget(budget) : '—';
  const endDateLabel = plannedEndDate
    ? new Date(plannedEndDate).toLocaleDateString('ru-RU', { year: 'numeric', month: 'short' })
    : '—';

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-4"
      style={{ borderTop: '1px solid var(--border)' }}
    >
      {/* СТАДИЯ */}
      <div style={{ borderRight: '1px solid var(--border)' }}>
        <MetricCard
          label="СТАДИЯ"
          primary={stage?.name ?? '—'}
          secondary={stage ? `этап ${stage.order} из ${stage.total}` : undefined}
        />
      </div>

      {/* БЮДЖЕТ */}
      <div style={{ borderRight: '1px solid var(--border)' }}>
        <MetricCard label="БЮДЖЕТ" primary={budgetLabel} />
      </div>

      {/* СДАЧА */}
      <div style={{ borderRight: '1px solid var(--border)' }}>
        <MetricCard label="СДАЧА" primary={endDateLabel} />
      </div>

      {/* ГОТОВНОСТЬ */}
      <div>
        <MetricCard
          label="ГОТОВНОСТЬ"
          primary={gprProgress != null ? `${gprProgress}%` : '—'}
          secondary={gprProgress != null ? 'СМР по договорам' : undefined}
        />
      </div>
    </div>
  );
}
