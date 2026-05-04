'use client';

import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import { IssueCard } from './IssueCard';
import type { AiComplianceCheck, AiComplianceIssue, IssueSeverity } from '@prisma/client';

type CheckWithIssues = AiComplianceCheck & { issues: AiComplianceIssue[] };

interface CheckResultsViewProps {
  checkId: string;
  objectId: string;
}

const SEVERITY_ORDER: IssueSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

function computeReadiness(issues: AiComplianceIssue[], checkedDocs: number): number {
  if (checkedDocs === 0) return 100;
  const penalty = issues.reduce((sum, v) => {
    if (v.resolvedAt) return sum;
    if (v.severity === 'CRITICAL') return sum + 40;
    if (v.severity === 'HIGH') return sum + 20;
    if (v.severity === 'MEDIUM') return sum + 5;
    return sum;
  }, 0);
  return Math.max(0, Math.min(100, 100 - Math.round(penalty / checkedDocs)));
}

export function CheckResultsView({ checkId, objectId }: CheckResultsViewProps) {
  const queryClient = useQueryClient();
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery<CheckWithIssues>({
    queryKey: ['compliance-check', checkId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/compliance-checks/${checkId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'QUEUED' || status === 'RUNNING' ? 3000 : false;
    },
  });

  const handleResolved = useCallback(
    (issueId: string) => {
      setResolvedIds((prev) => new Set(prev).add(issueId));
      void queryClient.invalidateQueries({ queryKey: ['compliance-check', checkId] });
    },
    [checkId, queryClient],
  );

  if (isLoading || !data) {
    return <div className="text-muted-foreground text-sm p-4">Загружаю результаты...</div>;
  }

  if (data.status === 'QUEUED' || data.status === 'RUNNING') {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground text-sm">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        <p>Проверка выполняется... Обычно 1–3 минуты</p>
      </div>
    );
  }

  if (data.status === 'FAILED') {
    return (
      <div className="text-red-600 text-sm p-4 bg-red-50 rounded">
        Проверка завершилась с ошибкой: {data.errorMessage ?? 'Неизвестная ошибка'}
      </div>
    );
  }

  const issues = data.issues ?? [];
  const readiness = computeReadiness(issues, data.checkedDocs);

  const countBySeverity = issues.reduce(
    (acc, v) => {
      if (!v.resolvedAt && !resolvedIds.has(v.id)) acc[v.severity as IssueSeverity]++;
      return acc;
    },
    { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 } as Record<IssueSeverity, number>,
  );

  const grouped = SEVERITY_ORDER.map((sev) => ({
    severity: sev,
    items: issues.filter((i) => i.severity === sev),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Готовность пакета ИД</h3>
          <span className="text-sm font-bold">{readiness}%</span>
        </div>
        <Progress value={readiness} className="h-2" />
        <p className="text-xs text-muted-foreground">{data.summary}</p>

        <div className="flex gap-3 text-xs flex-wrap">
          {countBySeverity.CRITICAL > 0 && (
            <span className="text-red-600 font-medium">⛔ {countBySeverity.CRITICAL} крит.</span>
          )}
          {countBySeverity.HIGH > 0 && (
            <span className="text-orange-500 font-medium">⚠ {countBySeverity.HIGH} высок.</span>
          )}
          {countBySeverity.MEDIUM > 0 && (
            <span className="text-yellow-600">! {countBySeverity.MEDIUM} средн.</span>
          )}
          {countBySeverity.LOW > 0 && (
            <span className="text-blue-500">{countBySeverity.LOW} низк.</span>
          )}
          {countBySeverity.CRITICAL === 0 && countBySeverity.HIGH === 0 && (
            <span className="text-green-600 font-medium">✓ Критичных нарушений нет</span>
          )}
        </div>
      </div>

      {grouped.length === 0 && (
        <div className="text-green-600 text-sm text-center py-4">
          Нарушений не обнаружено. Пакет ИД готов к сдаче.
        </div>
      )}

      {grouped.map(({ severity, items }) => (
        <div key={severity} className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {severity} ({items.length})
          </h4>
          {items.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              objectId={objectId}
              onResolved={handleResolved}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
