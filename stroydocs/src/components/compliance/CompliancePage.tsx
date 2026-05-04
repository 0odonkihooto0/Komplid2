'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { RunCheckDialog } from './RunCheckDialog';
import { CheckResultsView } from './CheckResultsView';
import type { AiComplianceCheck } from '@prisma/client';

interface CompliancePageProps {
  objectId: string;
}

function CompliancePageContent({ objectId }: CompliancePageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeCheckId = searchParams.get('checkId');

  const { data: checksData, refetch } = useQuery<{ data: AiComplianceCheck[] }>({
    queryKey: ['compliance-checks-list', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/compliance-checks`);
      return res.json();
    },
  });

  const checks = checksData?.data ?? [];
  const selectedCheckId = activeCheckId ?? checks[0]?.id;

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) void refetch();
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">AI-проверка комплектности ИД</h2>
        <Button onClick={() => setDialogOpen(true)}>+ Новая проверка</Button>
      </div>

      <div className="flex gap-4">
        {checks.length > 0 && (
          <aside className="w-48 shrink-0 space-y-1">
            {checks.map((check) => (
              <button
                key={check.id}
                type="button"
                onClick={() => router.push(`?checkId=${check.id}`)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  check.id === selectedCheckId
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="truncate">{new Date(check.createdAt).toLocaleDateString('ru-RU')}</div>
                <div className="text-xs text-muted-foreground capitalize">{check.status.toLowerCase()}</div>
              </button>
            ))}
          </aside>
        )}

        <main className="flex-1 min-w-0">
          {selectedCheckId ? (
            <CheckResultsView checkId={selectedCheckId} objectId={objectId} />
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <p className="mb-4">Проверки ещё не запускались</p>
              <Button onClick={() => setDialogOpen(true)}>Запустить первую проверку</Button>
            </div>
          )}
        </main>
      </div>

      <RunCheckDialog open={dialogOpen} onOpenChange={handleDialogClose} objectId={objectId} />
    </div>
  );
}

export function CompliancePage({ objectId }: CompliancePageProps) {
  return (
    <Suspense>
      <CompliancePageContent objectId={objectId} />
    </Suspense>
  );
}
