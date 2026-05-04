'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from './SeverityBadge';
import type { AiComplianceIssue, IssueSeverity, IssueCategory } from '@prisma/client';

interface IssueCardProps {
  issue: AiComplianceIssue;
  objectId: string;
  onResolved?: (issueId: string, resolution: string) => void;
}

const CATEGORY_LABELS: Record<IssueCategory, string> = {
  MISSING_DOCUMENT: 'Отсутствует документ',
  MISSING_SIGNATURE: 'Нет подписи',
  WRONG_DATE: 'Неверная дата',
  INCONSISTENCY: 'Несоответствие',
  MISSING_FIELD: 'Незаполненное поле',
  FORMAT_ERROR: 'Ошибка формата',
  REGULATORY: 'Нарушение норматива',
  MISSING_CERTIFICATE: 'Нет сертификата',
};

export function IssueCard({ issue, objectId, onResolved }: IssueCardProps) {
  const [resolving, setResolving] = useState(false);
  const isResolved = !!issue.resolvedAt;

  const resolve = async (resolution: 'manual_fix' | 'ignore' | 'not_applicable') => {
    setResolving(true);
    try {
      const res = await fetch(
        `/api/projects/${objectId}/compliance-checks/${issue.checkId}/issues/${issue.id}/resolve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolution }),
        },
      );
      if (res.ok) {
        onResolved?.(issue.id, resolution);
      }
    } finally {
      setResolving(false);
    }
  };

  return (
    <Card className={isResolved ? 'opacity-60' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2">
          <SeverityBadge severity={issue.severity as IssueSeverity} />
          <span className="text-xs text-muted-foreground">
            {CATEGORY_LABELS[issue.category as IssueCategory]}
          </span>
        </div>
        <CardTitle className="text-sm font-medium mt-1">{issue.title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <p className="text-sm text-muted-foreground">{issue.description}</p>

        {issue.standard && (
          <p className="text-xs text-muted-foreground font-mono">{issue.standard}</p>
        )}

        {issue.suggestedFix && (
          <div className="bg-blue-50 rounded p-2">
            <p className="text-xs text-blue-700">
              <span className="font-medium">Рекомендация: </span>
              {issue.suggestedFix}
            </p>
          </div>
        )}

        {issue.affectedDocIds.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {issue.affectedDocIds.map((docId) => (
              <a
                key={docId}
                href={`/objects/${objectId}/id?docId=${docId}`}
                className="text-xs text-blue-600 underline"
              >
                Перейти к документу
              </a>
            ))}
          </div>
        )}

        {!isResolved && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              disabled={resolving}
              onClick={() => resolve('manual_fix')}
            >
              Исправлено
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={resolving}
              onClick={() => resolve('ignore')}
            >
              Игнорировать
            </Button>
          </div>
        )}

        {isResolved && (
          <p className="text-xs text-green-600 font-medium">✓ Решено</p>
        )}
      </CardContent>
    </Card>
  );
}
