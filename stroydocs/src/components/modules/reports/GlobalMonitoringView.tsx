'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useGlobalMonitoring, type MonitoringObject } from './useGlobalMonitoring';
import type { ScheduleStatus } from '@/app/api/organizations/[orgId]/monitoring/route';

interface Props {
  orgId: string;
}

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  ON_TRACK: 'В графике',
  SLIGHT_DELAY: 'Лёгкое отставание',
  CRITICAL_DELAY: 'Критичное отставание',
};

const STATUS_COLORS: Record<ScheduleStatus, string> = {
  ON_TRACK: 'bg-green-100 text-green-800 border-green-200',
  SLIGHT_DELAY: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CRITICAL_DELAY: 'bg-red-100 text-red-800 border-red-200',
};

const STATUS_ICONS: Record<ScheduleStatus, string> = {
  ON_TRACK: '🟢',
  SLIGHT_DELAY: '🟡',
  CRITICAL_DELAY: '🔴',
};

function formatAmount(amount: number): string {
  if (amount === 0) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

function DefectBadge({ count, threshold }: { count: number; threshold: number }) {
  if (count === 0) return <span className="text-muted-foreground text-sm">0</span>;
  const variant = count >= threshold ? 'destructive' : 'secondary';
  return <Badge variant={variant}>{count}</Badge>;
}

function MonitoringRow({ obj }: { obj: MonitoringObject }) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        <Link
          href={`/objects/${obj.id}`}
          className="text-blue-600 hover:underline"
        >
          {obj.name}
        </Link>
        {obj.address && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
            {obj.address}
          </p>
        )}
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2 min-w-[100px]">
          <Progress value={obj.gprProgress} className="h-2 flex-1" />
          <span className="text-sm tabular-nums w-10 text-right">{obj.gprProgress}%</span>
        </div>
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2 min-w-[100px]">
          <Progress value={obj.idProgress} className="h-2 flex-1" />
          <span className="text-sm tabular-nums w-10 text-right">{obj.idProgress}%</span>
        </div>
      </TableCell>

      <TableCell className="text-center">
        <DefectBadge count={obj.openDefects} threshold={5} />
      </TableCell>

      <TableCell className="text-center">
        {obj.overdueDefects > 0 ? (
          <Badge variant="destructive">{obj.overdueDefects}</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">0</span>
        )}
      </TableCell>

      <TableCell className="text-right tabular-nums">
        {formatAmount(obj.ks2AmountMonth)}
      </TableCell>

      <TableCell>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[obj.scheduleStatus]}`}
        >
          {STATUS_ICONS[obj.scheduleStatus]} {STATUS_LABELS[obj.scheduleStatus]}
        </span>
      </TableCell>
    </TableRow>
  );
}

function SkeletonRows() {
  return Array.from({ length: 5 }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: 7 }).map((__, j) => (
        <TableCell key={j}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ));
}

export function GlobalMonitoringView({ orgId }: Props) {
  const { data, isLoading, isError } = useGlobalMonitoring(orgId);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Объект</TableHead>
            <TableHead className="min-w-[140px]">% ГПР</TableHead>
            <TableHead className="min-w-[140px]">% ИД</TableHead>
            <TableHead className="text-center">Дефекты</TableHead>
            <TableHead className="text-center">Просрочены</TableHead>
            <TableHead className="text-right">КС-2 за месяц</TableHead>
            <TableHead>Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <SkeletonRows />}

          {isError && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Не удалось загрузить данные мониторинга
              </TableCell>
            </TableRow>
          )}

          {data && data.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Объекты строительства не найдены
              </TableCell>
            </TableRow>
          )}

          {data?.map((obj) => <MonitoringRow key={obj.id} obj={obj} />)}
        </TableBody>
      </Table>
    </div>
  );
}
