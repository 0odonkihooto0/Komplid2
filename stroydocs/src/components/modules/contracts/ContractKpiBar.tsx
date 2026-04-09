'use client';

import { ClipboardList, FileText, CheckCircle, Package } from 'lucide-react';
import { useContractStats } from './useContractStats';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  onClick: () => void;
}

function KpiCard({ label, value, icon: Icon, onClick }: KpiCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left',
        'hover:bg-muted/50 hover:border-primary/30 transition-colors cursor-pointer'
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </button>
  );
}

interface Props {
  projectId: string;
  contractId: string;
  onTabChange: (tab: string) => void;
}

/** Горизонтальная полоса KPI-карточек договора */
export function ContractKpiBar({ projectId, contractId, onTabChange }: Props) {
  const { stats } = useContractStats(projectId, contractId);

  if (!stats) return null;

  return (
    <div className="flex flex-wrap gap-3">
      <KpiCard
        label="Работ выполнено"
        value={stats.workRecordsCount}
        icon={ClipboardList}
        onClick={() => onTabChange('work-records')}
      />
      <KpiCard
        label="АОСР создано"
        value={stats.aosrCount}
        icon={FileText}
        onClick={() => onTabChange('execution-docs')}
      />
      <KpiCard
        label="Подписано"
        value={stats.signedCount}
        icon={CheckCircle}
        onClick={() => onTabChange('execution-docs')}
      />
      <KpiCard
        label="Материалов"
        value={stats.materialsCount}
        icon={Package}
        onClick={() => onTabChange('materials')}
      />
    </div>
  );
}
