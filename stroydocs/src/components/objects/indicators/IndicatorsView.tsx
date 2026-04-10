'use client';

import { FileText, ClipboardList, FolderOpen, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/format';
import { useIndicators } from './useIndicators';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

function KpiCard({ title, value, icon }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface IndicatorsViewProps {
  projectId: string;
}

export function IndicatorsView({ projectId }: IndicatorsViewProps) {
  const { indicators, isLoading } = useIndicators(projectId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!indicators) {
    return <p className="text-muted-foreground">Не удалось загрузить показатели</p>;
  }

  const { totalContracts, totalWorkRecords, totalDocs, signedDocs, idReadinessPercent, totalKs2Amount } =
    indicators;

  // Цвет готовности ИД
  const readinessColor =
    idReadinessPercent < 30
      ? 'text-destructive'
      : idReadinessPercent < 70
        ? 'text-yellow-600'
        : 'text-green-600';

  return (
    <div className="space-y-6">
      {/* 4 KPI карточки */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Контрактов"
          value={totalContracts}
          icon={<FileText className="h-5 w-5" />}
        />
        <KpiCard
          title="Записей о работах"
          value={totalWorkRecords}
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <KpiCard
          title="Документов ИД"
          value={`${signedDocs} / ${totalDocs}`}
          icon={<FolderOpen className="h-5 w-5" />}
        />
        <KpiCard
          title="Сумма КС-2"
          value={formatCurrency(totalKs2Amount)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* Готовность ИД */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Готовность исполнительной документации</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {signedDocs} из {totalDocs} документов подписано
            </span>
            <span className={`text-lg font-semibold ${readinessColor}`}>
              {idReadinessPercent}%
            </span>
          </div>
          <Progress value={idReadinessPercent} className="h-3" />
          {idReadinessPercent < 70 && (
            <p className={`text-xs ${readinessColor}`}>
              {idReadinessPercent < 30
                ? 'Критически низкий уровень готовности ИД — требуется срочное внимание'
                : 'Уровень готовности ИД ниже нормы — рекомендуется ускорить подписание документов'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Заглушка графика план/факт */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">График план / факт СМР</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
            <p className="text-sm text-muted-foreground">
              График план/факт — доступен после интеграции ГПР
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
