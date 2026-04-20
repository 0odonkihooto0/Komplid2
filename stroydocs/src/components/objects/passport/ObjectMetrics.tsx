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
}

export function ObjectMetrics({ stage, gprProgress }: ObjectMetricsProps) {
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
      {/* TODO: подключить FundingRecord или поле модели — уточнить в отдельной задаче */}
      <div style={{ borderRight: '1px solid var(--border)' }}>
        <MetricCard label="БЮДЖЕТ" primary="—" />
      </div>

      {/* СДАЧА */}
      {/* TODO: подключить Contract.plannedEndDate или поле BuildingObject — уточнить в отдельной задаче */}
      <div style={{ borderRight: '1px solid var(--border)' }}>
        <MetricCard label="СДАЧА" primary="—" />
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
